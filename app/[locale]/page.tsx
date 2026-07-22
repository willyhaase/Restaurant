"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginForm from "@/components/LoginForm";
import Header from "@/components/Header";
import EveningView from "@/components/EveningView";
import MorningView from "@/components/MorningView";
import AdminView from "@/components/AdminView";
import SupplyView from "@/components/SupplyView";
import CalendarView from "@/components/CalendarView";
import PendingScreen from "@/components/PendingScreen";

type Mode = "evening" | "morning" | "supply" | "admin" | "calendar";

function AppShell({ locale }: { locale: string }) {
  const { session, profile, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("morning");
  const tApp = useTranslations("app");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🍴</div>
          <div className="text-sm">{tApp("loading")}</div>
        </div>
      </div>
    );
  }

  if (!session) return <LoginForm />;
  if (profile && !profile.approved) return <PendingScreen />;

  const role = profile?.role ?? "assistant";
  const isAdmin = role === "admin";

  // kitchen access by role
  const allowedKitchens: ("hot" | "cold")[] =
    role === "admin" ? ["hot", "cold"] :
    role === "chef" ? ["hot"] :
    ["cold"]; // assistant

  // all roles except admin can access morning+evening; only admin sees admin tab
  const effectiveMode = (mode === "admin" && !isAdmin) ? "morning" : mode as Mode;

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <Header mode={effectiveMode} onModeChange={setMode} locale={locale} />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {effectiveMode === "morning" && <MorningView locale={locale} allowedKitchens={allowedKitchens} />}
        {effectiveMode === "evening" && <EveningView locale={locale} allowedKitchens={allowedKitchens} />}
        {effectiveMode === "supply" && <SupplyView locale={locale} />}
        {effectiveMode === "calendar" && <CalendarView locale={locale} />}
        {effectiveMode === "admin" && <AdminView locale={locale} />}
      </main>
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <AuthProvider>
      <AppShell locale={locale} />
    </AuthProvider>
  );
}
