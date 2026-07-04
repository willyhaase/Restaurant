"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";

export default function PendingScreen() {
  const t = useTranslations("pending");
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{t("title")}</h2>
        <p className="text-sm text-gray-500 mb-6">{t("message")}</p>
        <button onClick={signOut} className="text-sm text-gray-500 underline">
          {t("logout")}
        </button>
      </div>
    </div>
  );
}
