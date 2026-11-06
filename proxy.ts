import { NextResponse, type NextRequest } from "next/server";
import { rejectReason } from "@/lib/apiGuard";

/** Rejects API requests that don't come from this app on this machine. */
export function proxy(request: NextRequest) {
  const reason = rejectReason({
    method: request.method,
    host: request.headers.get("host"),
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
  });
  if (reason) {
    return NextResponse.json({ error: reason }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
