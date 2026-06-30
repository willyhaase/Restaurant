"use client";

import { useState } from "react";
import EveningView from "@/components/EveningView";
import MorningView from "@/components/MorningView";

type Mode = "evening" | "morning";

export default function Home() {
  const [mode, setMode] = useState<Mode>("evening");

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">
            🍴 Кухня
          </h1>
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-100 p-1 gap-1">
            <button
              onClick={() => setMode("evening")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === "evening"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🌙 Вечер
            </button>
            <button
              onClick={() => setMode("morning")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === "morning"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              ☀️ Утро
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {mode === "evening" ? <EveningView /> : <MorningView />}
      </main>
    </div>
  );
}
