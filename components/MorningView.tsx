"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase, type KitchenType, type PrepTask, type QuantityMode, localizedName } from "@/lib/supabase";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(
    locale === "ru" ? "ru-RU" : locale === "de" ? "de-DE" : "en-US",
    { weekday: "long", day: "numeric", month: "long" }
  );
}

export default function MorningView({ locale, allowedKitchens }: { locale: string; allowedKitchens: ("hot" | "cold")[] }) {
  const t = useTranslations("morning");
  const tK = useTranslations("kitchen");

  const [tasks, setTasks] = useState<PrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSession, setNoSession] = useState(false);

  const todayDate = getTodayDate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: session } = await supabase
      .from("prep_sessions").select("id").eq("prep_date", todayDate).single();
    if (!session) { setNoSession(true); setLoading(false); return; }
    const { data: taskData } = await supabase
      .from("prep_tasks").select("*").eq("session_id", session.id)
      .order("kitchen_type");
    setTasks((taskData || []).sort((a, b) => {
      if (a.kitchen_type !== b.kitchen_type) return 0;
      return localizedName(a, locale).localeCompare(localizedName(b, locale));
    }));
    setLoading(false);
  }

  async function toggleDone(task: PrepTask) {
    const newDone = !task.done;
    await supabase.from("prep_tasks").update({ done: newDone }).eq("id", task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, done: newDone } : t));
  }

  async function resetAll() {
    const ids = tasks.map((t) => t.id);
    await supabase.from("prep_tasks").update({ done: false }).in("id", ids);
    setTasks((prev) => prev.map((t) => ({ ...t, done: false })));
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-400">⏳</div>;

  if (noSession) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-4">🌙</div>
        <h2 className="text-lg font-semibold text-gray-600 mb-2">{t("noSession")}</h2>
        <p className="text-sm">{t("noSessionHint")}</p>
      </div>
    );
  }

  const hotTasks = tasks.filter((t) => t.kitchen_type === "hot" && allowedKitchens.includes("hot"));
  const coldTasks = tasks.filter((t) => t.kitchen_type === "cold" && allowedKitchens.includes("cold"));
  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const allDone = doneCount === totalCount && totalCount > 0;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const MODE_LABELS: Record<QuantityMode, string> = {
    full: t("fullRecipe"),
    half: t("half"),
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">{t("title")}</p>
        <h2 className="text-xl font-bold text-gray-800 capitalize mt-0.5">{formatDate(todayDate, locale)}</h2>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {allDone ? `✅ ${t("allDone")}` : t("done", { done: doneCount, total: totalCount })}
          </span>
          <span className="text-sm font-bold text-gray-800">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-gray-800"}`} style={{ width: `${progress}%` }} />
        </div>
        {doneCount > 0 && !allDone && (
          <button onClick={resetAll} className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline">{t("reset")}</button>
        )}
      </div>

      {([["hot", hotTasks], ["cold", coldTasks]] as [KitchenType, PrepTask[]][]).map(([kitchen, kitchenTasks]) => {
        if (!kitchenTasks.length) return null;
        const kitchenDone = kitchenTasks.filter((t) => t.done).length;
        return (
          <div key={kitchen} className={`rounded-2xl border overflow-hidden ${kitchen === "hot" ? "border-orange-200" : "border-blue-200"}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${kitchen === "hot" ? "bg-orange-50" : "bg-blue-50"}`}>
              <h3 className="font-bold text-gray-800">{tK(kitchen)}</h3>
              <span className="text-xs font-medium text-gray-500">{kitchenDone}/{kitchenTasks.length}</span>
            </div>
            <div className="divide-y divide-gray-100 bg-white">
              {kitchenTasks.map((task) => (
                <button key={task.id} onClick={() => toggleDone(task)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${task.done ? "bg-gray-50" : "bg-white hover:bg-gray-50"}`}>
                  <div className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${task.done ? "bg-green-500 border-green-500" : kitchen === "hot" ? "border-orange-300" : "border-blue-300"}`}>
                    {task.done && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm transition-colors ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}>{localizedName(task, locale)}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.unit && <span className={`text-xs font-semibold ${task.done ? "text-gray-300" : "text-gray-700"}`}>{task.unit}</span>}
                      {task.quantity_mode && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${task.done ? "bg-gray-100 text-gray-300" : task.quantity_mode === "half" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                          {MODE_LABELS[task.quantity_mode]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
