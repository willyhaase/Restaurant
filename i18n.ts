import { getRequestConfig } from "next-intl/server";

const VALID_LOCALES = ["ru", "en", "de"] as const;
type Locale = (typeof VALID_LOCALES)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = (await requestLocale) as Locale;
  if (!locale || !VALID_LOCALES.includes(locale)) {
    locale = "de";
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
