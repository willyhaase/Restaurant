"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
];

type Mode = "evening" | "morning" | "supply" | "admin";

interface HeaderProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  locale: string;
}

const NAV_ICONS: Record<Mode, string> = {
  morning: "☀️",
  evening: "🌙",
  supply: "📦",
  admin: "⚙️",
};

export default function Header({ mode, onModeChange, locale }: HeaderProps) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tAdmin = useTranslations("admin");
  const tSupply = useTranslations("supply");
  const { profile, signOut, setLanguage } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function switchLocale(newLocale: string) {
    await setLanguage(newLocale);
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  const isAdmin = profile?.role === "admin";

  const tabs: { id: Mode; label: string }[] = [
    { id: "morning", label: t("morning") },
    { id: "evening", label: t("evening") },
    { id: "supply", label: tSupply("navLabel") },
    ...(isAdmin ? [{ id: "admin" as Mode, label: t("admin") }] : []),
  ];

  return (
    <>
      {/* Top app bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900 mr-1">🍴</span>
            <span className="text-sm font-semibold text-gray-700 flex-1 sm:flex-none">Hannig Saas-Fee</span>

            {/* Tabs — visible on sm+ screens (tablet/desktop) */}
            <div className="hidden sm:flex rounded-xl overflow-hidden border border-gray-200 bg-gray-100 p-0.5 gap-0.5 flex-1 max-w-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onModeChange(tab.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mode === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {NAV_ICONS[tab.id]} {tab.label}
                </button>
              ))}
            </div>

            {/* Locale switcher */}
            <div className="flex gap-0.5">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => switchLocale(l.code)}
                  className={`text-xs px-1.5 py-1 rounded-lg font-medium transition-all ${
                    locale === l.code
                      ? "bg-gray-900 text-white"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={signOut}
              title={tAuth("signOut")}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Role badge */}
          {profile && (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs text-gray-400">{profile.full_name || profile.email}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                profile.role === "admin" ? "bg-purple-100 text-purple-700" :
                profile.role === "chef" ? "bg-orange-100 text-orange-700" :
                "bg-blue-100 text-blue-700"
              }`}>
                {tAdmin(`roles.${profile.role}`)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Bottom navigation — mobile only */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onModeChange(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors`}
            >
              {mode === tab.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gray-900 rounded-b-full" />
              )}
              <span className="text-xl leading-none">{NAV_ICONS[tab.id]}</span>
              <span className={`text-[10px] font-medium ${mode === tab.id ? "text-gray-900" : "text-gray-400"}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
