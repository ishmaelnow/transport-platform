import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];
  if (host === "apply.eshapp.com" && request.nextUrl.pathname.startsWith("/transport")) {
    const url = request.nextUrl.clone();
    url.pathname = `/apply${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/transport/:path*"] };
