import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "de"],
  defaultLocale: "de",
  localeDetection: false,
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
