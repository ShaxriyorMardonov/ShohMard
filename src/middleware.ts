import { NextResponse, type NextRequest } from "next/server";

/**
 * Faqat yo'naltirish uchun (UX). Haqiqiy avtorizatsiya har bir sahifa,
 * server amali va route handlerda serverda tekshiriladi.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("samu_session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/exam/:path*", "/olympiad/:path*", "/olympiad"],
};
