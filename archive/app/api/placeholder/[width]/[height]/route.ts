import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ width: string; height: string }> }
) {
  const { width, height } = await params;

  // Validate dimensions
  const widthNum = parseInt(width);
  const heightNum = parseInt(height);

  if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
    return new NextResponse("Invalid dimensions", { status: 400 });
  }

  // Limit maximum dimensions for security
  if (widthNum > 4000 || heightNum > 4000) {
    return new NextResponse("Dimensions too large", { status: 400 });
  }

  // Create a simple SVG placeholder
  const svg = `
    <svg width="${widthNum}" height="${heightNum}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af" text-anchor="middle" dy=".3em">
        ${widthNum} × ${heightNum}
      </text>
    </svg>
  `.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
