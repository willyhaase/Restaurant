"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginForm from "@/components/LoginForm";
import Header from "@/components/Header";
import EveningView from "@/components/EveningView";
import MorningView from "@/components/MorningView";
import AdminView from "@/components/AdminView";

type Mode = "evening" | "morning" | "admin";

function AppShell({ locale }: { locale: string }) {
  const { session, profile, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("morning");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🍴</div>
          <div className="text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) return <LoginForm />;

  const isChef = profile?.role === "chef" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  // Redirect assistant away from restricted modes
  const effectiveMode = mode === "evening" && !isChef ? "morning"
    : mode === "admin" && !isAdmin ? "morning"
    : mode;

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <Header mode={effectiveMode} onModeChange={setMode} locale={locale} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {effectiveMode === "morning" && <MorningView />}
        {effectiveMode === "evening" && <EveningView />}
        {effectiveMode === "admin" && <AdminView />}
      </main>
    </div>
  );
}

export default function Page({ params }: { params: { locale: string } }) {
  return (
    <AuthProvider>
      <AppShell locale={params.locale} />
    </AuthProvider>
  );
}
