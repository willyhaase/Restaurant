"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, type KitchenType, type PrepSession, type PrepTask, type PrepItemTemplate } from "@/lib/supabase";

const KITCHEN_LABELS: Record<KitchenType, string> = {
  hot: "🔥 Горячая кухня",
  cold: "❄️ Холодная кухня",
};

const KITCHEN_COLORS: Record<KitchenType, string> = {
  hot: "bg-orange-50 border-orange-200",
  cold: "bg-blue-50 border-blue-200",
};

const KITCHEN_BADGE: Record<KitchenType, string> = {
  hot: "bg-orange-100 text-orange-700",
  cold: "bg-blue-100 text-blue-700",
};

interface AddForm {
  name: string;
  unit: string;
  note: string;
  kitchen_type: KitchenType;
}

const EMPTY_FORM: AddForm = { name: "", unit: "", note: "", kitchen_type: "hot" };

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

export default function EveningView() {
  const [session, setSession] = useState<PrepSession | null>(null);
  const [tasks, setTasks] = useState<PrepTask[]>([]);
  const [templates, setTemplates] = useState<PrepItemTemplate[]>([]);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<PrepItemTemplate[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const tomorrowDate = getTomorrowDate();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    // Get or create session for tomorrow
    let { data: existing } = await supabase
      .from("prep_sessions")
      .select("*")
      .eq("prep_date", tomorrowDate)
      .single();

    if (!existing) {
      const { data: created } = await supabase
        .from("prep_sessions")
        .insert({ prep_date: tomorrowDate })
        .select()
        .single();
      existing = created;
    }

    if (existing) {
      setSession(existing);
      const { data: taskData } = await supabase
        .from("prep_tasks")
        .select("*")
        .eq("session_id", existing.id)
        .order("created_at", { ascending: true });
      setTasks(taskData || []);
    }

    const { data: tmpl } = await supabase
      .from("prep_item_templates")
      .select("*")
      .order("name");
    setTemplates(tmpl || []);

    setLoading(false);
  }

  function handleNameChange(value: string) {
    setForm((f) => ({ ...f, name: value }));
    if (value.length > 0) {
      const filtered = templates.filter((t) =>
        t.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  function selectTemplate(t: PrepItemTemplate) {
    setForm({ name: t.name, unit: t.unit, kitchen_type: t.kitchen_type, note: "" });
    setShowSuggestions(false);
    nameRef.current?.blur();
  }

  async function addTask() {
    if (!form.name.trim() || !session) return;
    setAdding(true);

    const { data: newTask } = await supabase
      .from("prep_tasks")
      .insert({
        session_id: session.id,
        name: form.name.trim(),
        unit: form.unit.trim(),
        kitchen_type: form.kitchen_type,
        note: form.note.trim() || null,
      })
      .select()
      .single();

    if (newTask) {
      setTasks((prev) => [...prev, newTask]);

      // Save as template if not already exists
      const exists = templates.some(
        (t) => t.name.toLowerCase() === form.name.trim().toLowerCase()
      );
      if (!exists) {
        const { data: tmpl } = await supabase
          .from("prep_item_templates")
          .insert({ name: form.name.trim(), unit: form.unit.trim(), kitchen_type: form.kitchen_type })
          .select()
          .single();
        if (tmpl) setTemplates((prev) => [...prev, tmpl]);
      }
    }

    setForm((f) => ({ ...EMPTY_FORM, kitchen_type: f.kitchen_type }));
    setAdding(false);
  }

  async function removeTask(id: string) {
    await supabase.from("prep_tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const hotTasks = tasks.filter((t) => t.kitchen_type === "hot");
  const coldTasks = tasks.filter((t) => t.kitchen_type === "cold");

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

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div className="text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Заготовки на завтра</p>
        <h2 className="text-xl font-bold text-gray-800 capitalize mt-0.5">
          {formatDate(tomorrowDate)}
        </h2>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          Добавить заготовку
        </h3>

        {/* Kitchen type toggle */}
        <div className="flex gap-2">
          {(["hot", "cold"] as KitchenType[]).map((k) => (
            <button
              key={k}
              onClick={() => setForm((f) => ({ ...f, kitchen_type: k }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                form.kitchen_type === k
                  ? k === "hot"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-blue-500 text-white border-blue-500"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {KITCHEN_LABELS[k]}
            </button>
          ))}
        </div>

        {/* Name input with suggestions */}
        <div className="relative">
          <input
            ref={nameRef}
            type="text"
            placeholder="Название (напр. соус болоньезе)"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => {
              if (form.name.length > 0 && suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
          />
          {showSuggestions && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={() => selectTemplate(s)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-0"
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${KITCHEN_BADGE[s.kitchen_type]}`}>
                    {s.kitchen_type === "hot" ? "🔥" : "❄️"}
                  </span>
                  <span>{s.name}</span>
                  {s.unit && <span className="text-gray-400 text-xs ml-auto">{s.unit}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Unit + Note row */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Кол-во / ед. (напр. 2 кг)"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
          />
        </div>

        <input
          type="text"
          placeholder="Заметка (необязательно)"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
        />

        <button
          onClick={addTask}
          disabled={!form.name.trim() || adding}
          className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-gray-800 active:bg-gray-700 transition-colors"
        >
          {adding ? "Добавляю..." : "Добавить"}
        </button>
      </div>

      {/* Task lists */}
      {(["hot", "cold"] as KitchenType[]).map((kitchen) => {
        const kitchenTasks = kitchen === "hot" ? hotTasks : coldTasks;
        if (kitchenTasks.length === 0) return null;
        return (
          <div key={kitchen} className={`rounded-2xl border ${KITCHEN_COLORS[kitchen]} overflow-hidden`}>
            <div className="px-4 py-3 border-b border-current border-opacity-20">
              <h3 className="font-bold text-gray-800">{KITCHEN_LABELS[kitchen]}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{kitchenTasks.length} позиц.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {kitchenTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 px-4 py-3 bg-white bg-opacity-70">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{task.name}</p>
                    {task.unit && (
                      <p className="text-xs text-gray-500 mt-0.5">{task.unit}</p>
                    )}
                    {task.note && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">{task.note}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 -mr-1 flex-shrink-0 text-lg leading-none"
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm">Список пуст. Добавьте заготовки на завтра.</p>
        </div>
      )}
    </div>
  );
}
