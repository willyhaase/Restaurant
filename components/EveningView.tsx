"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase, type KitchenType, type QuantityMode, type PrepItemTemplate } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(
    locale === "ru" ? "ru-RU" : locale === "de" ? "de-DE" : "en-US",
    { weekday: "long", day: "numeric", month: "long" }
  );
}

export default function EveningView() {
  const t = useTranslations("evening");
  const tK = useTranslations("kitchen");
  const { profile } = useAuth();

  const [templates, setTemplates] = useState<PrepItemTemplate[]>([]);
  const [selections, setSelections] = useState<Map<string, QuantityMode>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemKitchen, setNewItemKitchen] = useState<KitchenType>("hot");
  const [newItemFull, setNewItemFull] = useState("");
  const [newItemHalf, setNewItemHalf] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const tomorrowDate = getTomorrowDate();
  const locale = profile?.language || "ru";

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: tmpl } = await supabase
      .from("prep_item_templates").select("*").eq("active", true).order("name");
    setTemplates(tmpl || []);

    const { data: session } = await supabase
      .from("prep_sessions").select("id").eq("prep_date", tomorrowDate).single();
    if (session) {
      const { data: tasks } = await supabase
        .from("prep_tasks").select("template_id, quantity_mode")
        .eq("session_id", session.id).not("template_id", "is", null);
      if (tasks) {
        const map = new Map<string, QuantityMode>();
        tasks.forEach((t) => { if (t.template_id && t.quantity_mode) map.set(t.template_id, t.quantity_mode); });
        setSelections(map);
        if (map.size > 0) setSaved(true);
      }
    }
    setLoading(false);
  }

  function toggle(templateId: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.set(templateId, "full");
      return next;
    });
    setSaved(false);
  }

  function setMode(templateId: string, mode: QuantityMode) {
    setSelections((prev) => { const next = new Map(prev); next.set(templateId, mode); return next; });
    setSaved(false);
  }

  async function saveList() {
    if (selections.size === 0) return;
    setSaving(true);
    let sessionId: string;
    const { data: existing } = await supabase
      .from("prep_sessions").select("id").eq("prep_date", tomorrowDate).single();
    if (existing) {
      sessionId = existing.id;
      await supabase.from("prep_tasks").delete().eq("session_id", sessionId);
    } else {
      const { data: created } = await supabase
        .from("prep_sessions").insert({ prep_date: tomorrowDate }).select("id").single();
      sessionId = created!.id;
    }
    const tmplMap = new Map(templates.map((t) => [t.id, t]));
    const tasks = Array.from(selections.entries()).map(([templateId, mode]) => {
      const tmpl = tmplMap.get(templateId)!;
      return { session_id: sessionId, template_id: templateId, name: tmpl.name,
        unit: mode === "full" ? tmpl.full_quantity : tmpl.half_quantity,
        kitchen_type: tmpl.kitchen_type, quantity_mode: mode, done: false };
    });
    await supabase.from("prep_tasks").insert(tasks);
    setSaving(false);
    setSaved(true);
  }

  async function addCustomItem() {
    if (!newItemName.trim() || !newItemFull.trim()) return;
    const { data } = await supabase.from("prep_item_templates")
      .insert({ name: newItemName.trim(), kitchen_type: newItemKitchen,
        full_quantity: newItemFull.trim(), half_quantity: newItemHalf.trim(), unit: "", active: true })
      .select().single();
    if (data) setTemplates((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewItemName(""); setNewItemFull(""); setNewItemHalf(""); setShowAddForm(false);
  }

  const hotTemplates = templates.filter((t) => t.kitchen_type === "hot");
  const coldTemplates = templates.filter((t) => t.kitchen_type === "cold");

  if (loading) return <div className="flex justify-center py-20 text-gray-400">⏳</div>;

  return (
    <div className="space-y-5 pb-24">
      <div className="text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">{t("title")}</p>
        <h2 className="text-xl font-bold text-gray-800 capitalize mt-0.5">{formatDate(tomorrowDate, locale)}</h2>
        {selections.size > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {t("selected", { count: selections.size })}
          </p>
        )}
      </div>

      {([["hot", hotTemplates], ["cold", coldTemplates]] as [KitchenType, PrepItemTemplate[]][]).map(([kitchen, items]) => (
        <div key={kitchen} className="space-y-2">
          <h3 className={`font-bold text-sm px-1 ${kitchen === "hot" ? "text-orange-600" : "text-blue-600"}`}>
            {tK(kitchen)}
          </h3>
          <div className={`rounded-2xl border overflow-hidden divide-y ${kitchen === "hot" ? "border-orange-200 divide-orange-100" : "border-blue-200 divide-blue-100"}`}>
            {items.map((tmpl) => {
              const selected = selections.has(tmpl.id);
              const mode = selections.get(tmpl.id) ?? "full";
              return (
                <div key={tmpl.id} className={`bg-white transition-colors ${selected ? (kitchen === "hot" ? "bg-orange-50" : "bg-blue-50") : ""}`}>
                  <button onClick={() => toggle(tmpl.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selected ? (kitchen === "hot" ? "bg-orange-500 border-orange-500" : "bg-blue-500 border-blue-500") : "border-gray-300"}`}>
                      {selected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`flex-1 text-sm font-medium ${selected ? "text-gray-900" : "text-gray-600"}`}>{tmpl.name}</span>
                    {!selected && <span className="text-xs text-gray-400">{tmpl.full_quantity}</span>}
                  </button>
                  {selected && (
                    <div className="flex gap-2 px-4 pb-3">
                      <button onClick={() => setMode(tmpl.id, "full")} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${mode === "full" ? (kitchen === "hot" ? "bg-orange-500 text-white border-orange-500" : "bg-blue-500 text-white border-blue-500") : "bg-white text-gray-500 border-gray-200"}`}>
                        {t("fullRecipe")}<span className="block font-normal opacity-80">{tmpl.full_quantity}</span>
                      </button>
                      <button onClick={() => setMode(tmpl.id, "half")} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${mode === "half" ? (kitchen === "hot" ? "bg-orange-500 text-white border-orange-500" : "bg-blue-500 text-white border-blue-500") : "bg-white text-gray-500 border-gray-200"}`}>
                        {t("half")}<span className="block font-normal opacity-80">{tmpl.half_quantity}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add custom item */}
      <div>
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors">
            {t("addItem")}
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm">{t("newItem")}</h3>
            <div className="flex gap-2">
              {(["hot", "cold"] as KitchenType[]).map((k) => (
                <button key={k} onClick={() => setNewItemKitchen(k)} className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${newItemKitchen === k ? (k === "hot" ? "bg-orange-500 text-white border-orange-500" : "bg-blue-500 text-white border-blue-500") : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {tK(k)}
                </button>
              ))}
            </div>
            <input type="text" placeholder={t("itemName")} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50" />
            <div className="flex gap-2">
              <input type="text" placeholder={t("fullRecipe")} value={newItemFull} onChange={(e) => setNewItemFull(e.target.value)} className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none bg-gray-50" />
              <input type="text" placeholder={t("half")} value={newItemHalf} onChange={(e) => setNewItemHalf(e.target.value)} className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none bg-gray-50" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500">{t("cancel")}</button>
              <button onClick={addCustomItem} disabled={!newItemName.trim() || !newItemFull.trim()} className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40">{t("add")}</button>
            </div>
          </div>
        )}
      </div>

      {selections.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-2xl mx-auto">
            <button onClick={saveList} disabled={saving || saved} className={`w-full py-4 rounded-2xl text-sm font-bold transition-all ${saved ? "bg-green-500 text-white" : "bg-gray-900 text-white hover:bg-gray-800 active:scale-95"} disabled:opacity-60`}>
              {saving ? t("saving") : saved ? `✅ ${t("saved")}` : t("save", { count: selections.size })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
