import { createHmac, timingSafeEqual } from "crypto";

function base64UrlEncode(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecodeToBuffer(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

export interface BookingAccessTokenPayload {
  bookingId: string;
  exp: number; // unix seconds
}

function getSecret() {
  return (
    process.env.BOOKING_ACCESS_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

export function signBookingAccessToken(payload: BookingAccessTokenPayload) {
  const secret = getSecret();
  if (!secret) throw new Error("Missing BOOKING_ACCESS_TOKEN_SECRET");

  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest();
  const sigEnc = base64UrlEncode(sig);
  return `${body}.${sigEnc}`;
}

export function verifyBookingAccessToken(token: string): BookingAccessTokenPayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const expected = createHmac("sha256", secret).update(body).digest();
    const provided = base64UrlDecodeToBuffer(sig);
    if (provided.length !== expected.length) return null;
    if (!timingSafeEqual(provided, expected)) return null;

    const decoded = JSON.parse(base64UrlDecodeToBuffer(body).toString("utf8")) as BookingAccessTokenPayload;
    if (!decoded?.bookingId || !decoded?.exp) return null;

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;

    return decoded;
  } catch {
    return null;
  }
}
