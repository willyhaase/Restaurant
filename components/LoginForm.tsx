"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
  const t = useTranslations("auth");
  const tApp = useTranslations("app");
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "login") {
      const err = await signIn(email, password);
      if (err) setError(t("invalidCredentials"));
    } else {
      const err = await signUp(email, password, fullName);
      if (err) {
        setError(err.includes("already") ? t("emailTaken") : t("registerError"));
      } else {
        setRegistered(true);
      }
    }
    setLoading(false);
  }

  const tPending = useTranslations("pending");

  if (registered) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t("registerSuccess")}</h2>
          <p className="text-sm text-gray-500 mb-6">{tPending("message")}</p>
          <button onClick={() => { setRegistered(false); setMode("login"); }}
            className="text-sm text-gray-500 underline">{t("haveAccount")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍴</div>
          <h1 className="text-2xl font-bold text-gray-900">{tApp("title")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t("fullName")}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
                placeholder="Anna Müller"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t("email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
              placeholder="chef@restaurant.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-gray-800 transition-colors"
          >
            {loading
              ? (mode === "login" ? t("signingIn") : t("registering"))
              : (mode === "login" ? t("signIn") : t("register"))}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            className="text-gray-700 font-medium underline"
          >
            {mode === "login" ? t("register") : t("signIn")}
          </button>
        </p>
      </div>
    </div>
  );
}
