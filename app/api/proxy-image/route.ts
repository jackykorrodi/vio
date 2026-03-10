import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  if (rawUrl.length > 2048) return NextResponse.json({ error: 'URL too long' }, { status: 400 });

  // Only allow http/https URLs (block SSRF via file://, ftp://, data:, etc.)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const res = await fetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VIO/1.0)' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return new NextResponse(null, { status: 404 });

    // Enforce image content-type
    const rawContentType = res.headers.get('Content-Type') || '';
    const contentType = rawContentType.split(';')[0].trim().toLowerCase() || 'image/jpeg';
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return new NextResponse(null, { status: 415 });
    }

    // Limit response size to 5 MB
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return new NextResponse(null, { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
