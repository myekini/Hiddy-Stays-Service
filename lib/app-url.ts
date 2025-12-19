const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

export const getAppBaseUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit) return normalizeBaseUrl(explicit);

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercel) {
    const withScheme = vercel.startsWith("http://") || vercel.startsWith("https://")
      ? vercel
      : `https://${vercel}`;
    return normalizeBaseUrl(withScheme);
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return "https://hiddystays.com";
};

export const buildAppUrl = (path: string): string => {
  const baseUrl = getAppBaseUrl();

  if (!path) return baseUrl;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
