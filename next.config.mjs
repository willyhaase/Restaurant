import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://gdzjaznuxqjijuscrgce.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkemphem51eHFqaWp1c2NyZ2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTE2MjEsImV4cCI6MjA5ODM4NzYyMX0.4YQJPQ8LdE1kkDuB1IJm81BvWti_gKT62j8sffS0nqU",
  },
};

export default withNextIntl(nextConfig);
