import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

export async function middleware(req: NextRequest) {
  // Auth disabled when APP_PASSWORD empty/unset — do not require SESSION_SECRET
  if (!process.env.APP_PASSWORD) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return new NextResponse(
      "SESSION_SECRET must be set (32+ chars) when APP_PASSWORD is enabled",
      { status: 500 },
    );
  }

  const res = NextResponse.next();
  const session = await getIronSession<{ authenticated?: boolean }>(req, res, {
    cookieName: "wfm_ht_session",
    password: secret,
    cookieOptions: {
      httpOnly: true,
      // Localhost HTTP only — never set Secure or cookies break under `next start`
      secure: false,
      sameSite: "lax",
      path: "/",
    },
  });

  const path = req.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/_next") || path === "/favicon.ico") {
    // Already signed in → skip login page
    if (path === "/login" && session.authenticated) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return res;
  }

  if (!session.authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
