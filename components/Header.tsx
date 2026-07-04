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


export default function Header({ mode, onModeChange, locale }: HeaderProps) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tAdmin = useTranslations("admin");
  const tSupply = useTranslations("supply");
  const { profile, signOut, setLanguage } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function switchLocale(newLocale: string) {
    await setLanguage(newLocale); // updates DB first, then local state
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2">
          {/* App name */}
          <span className="text-base font-bold text-gray-900 mr-1">🍴</span>

          {/* Mode tabs */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-100 p-0.5 gap-0.5 flex-1">
            <button
              onClick={() => onModeChange("morning")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "morning" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              ☀️ {t("morning")}
            </button>
            <button
              onClick={() => onModeChange("evening")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "evening" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              🌙 {t("evening")}
            </button>
            <button
              onClick={() => onModeChange("supply")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "supply" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              📦 {tSupply("navLabel")}
            </button>
            {isAdmin && (
              <button
                onClick={() => onModeChange("admin")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === "admin" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                ⚙️ {t("admin")}
              </button>
            )}
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

          {/* User + logout */}
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
  );
}
