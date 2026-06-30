"use client";

import { useEffect, useState } from "react";
import { supabase, type KitchenType, type PrepTask, type QuantityMode } from "@/lib/supabase";

const MODE_LABELS: Record<QuantityMode, string> = {
  full: "полный рецепт",
  half: "половина",
};

const KITCHEN_LABELS: Record<KitchenType, string> = {
  hot: "🔥 Горячая кухня",
  cold: "❄️ Холодная кухня",
};

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

export default function MorningView() {
  const [tasks, setTasks] = useState<PrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSession, setNoSession] = useState(false);

  const todayDate = getTodayDate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: session } = await supabase
      .from("prep_sessions")
      .select("id")
      .eq("prep_date", todayDate)
      .single();

    if (!session) {
      setNoSession(true);
      setLoading(false);
      return;
    }

    const { data: taskData } = await supabase
      .from("prep_tasks")
      .select("*")
      .eq("session_id", session.id)
      .order("kitchen_type", { ascending: true })
      .order("created_at", { ascending: true });

    setTasks(taskData || []);
    setLoading(false);
  }

  async function toggleDone(task: PrepTask) {
    const newDone = !task.done;
    await supabase.from("prep_tasks").update({ done: newDone }).eq("id", task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: newDone } : t)));
  }

  async function resetAll() {
    const ids = tasks.map((t) => t.id);
    await supabase.from("prep_tasks").update({ done: false }).in("id", ids);
    setTasks((prev) => prev.map((t) => ({ ...t, done: false })));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-2">⏳</div>
          <div className="text-sm">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (noSession) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-4">🌙</div>
        <h2 className="text-lg font-semibold text-gray-600 mb-2">Список не составлен</h2>
        <p className="text-sm">
          Вечером добавьте заготовки на сегодня в режиме «Вечер».
        </p>
      </div>
    );
  }

  const hotTasks = tasks.filter((t) => t.kitchen_type === "hot");
  const coldTasks = tasks.filter((t) => t.kitchen_type === "cold");
  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const allDone = doneCount === totalCount && totalCount > 0;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Date + progress */}
      <div className="text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Заготовки на сегодня</p>
        <h2 className="text-xl font-bold text-gray-800 capitalize mt-0.5">
          {formatDate(todayDate)}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {allDone ? "✅ Всё готово!" : `Выполнено ${doneCount} из ${totalCount}`}
          </span>
          <span className="text-sm font-bold text-gray-800">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allDone ? "bg-green-500" : "bg-gray-800"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {doneCount > 0 && !allDone && (
          <button
            onClick={resetAll}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Сбросить все отметки
          </button>
        )}
      </div>

      {/* Task lists by kitchen */}
      {(["hot", "cold"] as KitchenType[]).map((kitchen) => {
        const kitchenTasks = kitchen === "hot" ? hotTasks : coldTasks;
        if (kitchenTasks.length === 0) return null;

        const kitchenDone = kitchenTasks.filter((t) => t.done).length;

        return (
          <div
            key={kitchen}
            className={`rounded-2xl border overflow-hidden ${
              kitchen === "hot" ? "border-orange-200" : "border-blue-200"
            }`}
          >
            <div
              className={`px-4 py-3 flex items-center justify-between ${
                kitchen === "hot" ? "bg-orange-50" : "bg-blue-50"
              }`}
            >
              <h3 className="font-bold text-gray-800">{KITCHEN_LABELS[kitchen]}</h3>
              <span className="text-xs font-medium text-gray-500">
                {kitchenDone}/{kitchenTasks.length}
              </span>
            </div>

            <div className="divide-y divide-gray-100 bg-white">
              {kitchenTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggleDone(task)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-gray-50 ${
                    task.done ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
                      task.done
                        ? "bg-green-500 border-green-500"
                        : kitchen === "hot"
                        ? "border-orange-300"
                        : "border-blue-300"
                    }`}
                  >
                    {task.done && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm transition-colors ${
                        task.done ? "line-through text-gray-400" : "text-gray-800"
                      }`}
                    >
                      {task.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.unit && (
                        <span className={`text-xs font-semibold ${task.done ? "text-gray-300" : "text-gray-700"}`}>
                          {task.unit}
                        </span>
                      )}
                      {task.quantity_mode && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          task.done
                            ? "bg-gray-100 text-gray-300"
                            : task.quantity_mode === "half"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {MODE_LABELS[task.quantity_mode]}
                        </span>
                      )}
                    </div>
                    {task.note && (
                      <p className={`text-xs mt-0.5 italic ${task.done ? "text-gray-300" : "text-gray-400"}`}>
                        {task.note}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm">На сегодня заготовок нет.</p>
        </div>
      )}
    </div>
  );
}
