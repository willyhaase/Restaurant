import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["ru", "en", "de"],
  defaultLocale: "ru",
  localeDetection: false,
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
