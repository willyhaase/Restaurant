import { getRequestConfig } from "next-intl/server";

const VALID_LOCALES = ["ru", "en", "de"] as const;

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = VALID_LOCALES.includes(locale as (typeof VALID_LOCALES)[number])
    ? locale!
    : "ru";
  return {
    locale: safeLocale,
    messages: (await import(`./messages/${safeLocale}.json`)).default,
  };
});
