import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["ru", "en", "de"],
  defaultLocale: "ru",
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
