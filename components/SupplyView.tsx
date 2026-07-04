"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase, type SupplyItem, type SupplyFlag, localizedName } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type FlagDraft = { status: "low" | "out"; quantity: string };

export default function SupplyView({ locale }: { locale: string }) {
  const t = useTranslations("supply");
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [items, setItems] = useState<SupplyItem[]>([]);
  const [flags, setFlags] = useState<SupplyFlag[]>([]);
  const [drafts, setDrafts] = useState<Map<string, FlagDraft>>(new Map());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin: add item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameDe, setNewNameDe] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: itemData }, { data: flagData }] = await Promise.all([
      supabase.from("supply_items").select("*").eq("active", true).order("sort_order").order("name"),
      supabase.from("supply_flags").select("*, supply_items(*)").eq("resolved", false).order("reported_at", { ascending: false }),
    ]);
    setItems((itemData || []).sort((a, b) =>
      localizedName(a, locale).localeCompare(localizedName(b, locale))
    ));
    setFlags(flagData || []);

    // Pre-mark items that already have an active flag today
    const alreadyFlagged = new Set<string>(
      (flagData || []).map((f: SupplyFlag) => f.item_id)
    );
    setSubmitted(alreadyFlagged);
    setLoading(false);
  }

  function setDraft(itemId: string, patch: Partial<FlagDraft>) {
    setDrafts((prev) => {
      const next = new Map(prev);
      const cur = next.get(itemId) ?? { status: "out", quantity: "" };
      next.set(itemId, { ...cur, ...patch });
      return next;
    });
    // clear submitted state when editing again
    setSubmitted((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
  }

  async function report(item: SupplyItem) {
    const draft = drafts.get(item.id);
    if (!draft) return;
    setSubmitting(item.id);
    await supabase.from("supply_flags").insert({
      item_id: item.id,
      status: draft.status,
      quantity_remaining: draft.quantity ? parseFloat(draft.quantity) : null,
      unit: item.unit,
      reported_by: profile?.id ?? null,
      reported_by_name: profile?.full_name ?? null,
    });
    setSubmitted((prev) => new Set(prev).add(item.id));
    setSubmitting(null);
    // refresh flags list
    const { data } = await supabase
      .from("supply_flags").select("*, supply_items(*)").eq("resolved", false).order("reported_at", { ascending: false });
    setFlags(data || []);
  }

  async function resolve(flagId: string) {
    setResolving(flagId);
    await supabase.from("supply_flags").update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by_name: profile?.full_name ?? null,
    }).eq("id", flagId);
    setFlags((prev) => prev.filter((f) => f.id !== flagId));
    setSubmitted((prev) => {
      const flag = flags.find((f) => f.id === flagId);
      if (!flag) return prev;
      const n = new Set(prev);
      n.delete(flag.item_id);
      return n;
    });
    setResolving(null);
  }

  async function addItem() {
    if (!newName.trim()) return;
    const { data } = await supabase.from("supply_items").insert({
      name: newName.trim(),
      name_en: newNameEn.trim() || newName.trim(),
      name_de: newNameDe.trim() || newName.trim(),
      unit: newUnit.trim() || "kg",
      category: newCategory.trim() || null,
      active: true,
    }).select().single();
    if (data) {
      setItems((prev) => [...prev, data].sort((a, b) =>
        localizedName(a, locale).localeCompare(localizedName(b, locale))
      ));
    }
    setNewName(""); setNewNameEn(""); setNewNameDe(""); setNewUnit("kg"); setNewCategory("");
    setShowAddForm(false);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(
      locale === "de" ? "de-DE" : "en-US",
      { hour: "2-digit", minute: "2-digit" }
    );
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-400">⏳</div>;

  return (
    <div className="space-y-5 pb-8">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>

      {/* Active flags summary — visible to all, prominent for admin */}
      {flags.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t("flagsTitle")}</h3>
          <div className="rounded-2xl border border-red-200 overflow-hidden divide-y divide-red-100">
            {flags.map((flag) => {
              const item = flag.supply_items;
              const name = item ? localizedName(item, locale) : "—";
              return (
                <div key={flag.id} className="bg-white px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-800">{name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        flag.status === "out"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {flag.status === "out" ? t("statusOut") : t("statusLow")}
                      </span>
                      {flag.quantity_remaining != null && (
                        <span className="text-xs text-gray-500">
                          {t("remaining")}: {flag.quantity_remaining} {flag.unit}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t("reportedBy", { name: flag.reported_by_name || "—" })} · {formatTime(flag.reported_at)}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => resolve(flag.id)}
                      disabled={resolving === flag.id}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium bg-green-500 text-white disabled:opacity-50"
                    >
                      {resolving === flag.id ? t("resolving") : t("resolve")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items list for reporting */}
      <div className="space-y-2">
        {items.map((item) => {
          const draft = drafts.get(item.id);
          const isSubmitted = submitted.has(item.id);
          const isActive = !!draft;

          return (
            <div key={item.id} className={`bg-white rounded-2xl border transition-colors ${
              isSubmitted ? "border-green-200" : isActive ? "border-gray-300" : "border-gray-200"
            }`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{localizedName(item, locale)}</p>
                  {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                </div>

                {isSubmitted ? (
                  <span className="text-xs font-medium text-green-600">{t("reported")}</span>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setDraft(item.id, { status: "low", quantity: draft?.quantity ?? "" })}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all ${
                        draft?.status === "low"
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {t("statusLow")}
                    </button>
                    <button
                      onClick={() => setDraft(item.id, { status: "out", quantity: "" })}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all ${
                        draft?.status === "out"
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {t("statusOut")}
                    </button>
                  </div>
                )}
              </div>

              {isActive && !isSubmitted && (
                <div className="px-4 pb-3 flex gap-2">
                  {draft.status === "low" && (
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder={`${t("remaining")} (${item.unit})`}
                      value={draft.quantity}
                      onChange={(e) => setDraft(item.id, { quantity: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  )}
                  <button
                    onClick={() => report(item)}
                    disabled={submitting === item.id}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {submitting === item.id ? t("reporting") : t("report")}
                  </button>
                  <button
                    onClick={() => setDrafts((prev) => { const n = new Map(prev); n.delete(item.id); return n; })}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin: add product */}
      {isAdmin && (
        <div>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            >
              + {t("addItem")}
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <input type="text" placeholder={t("itemName")} value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300" />
              <div className="flex gap-2">
                <input type="text" placeholder="Name (EN)" value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" />
                <input type="text" placeholder="Name (DE)" value={newNameDe}
                  onChange={(e) => setNewNameDe(e.target.value)}
                  className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder={t("itemUnit")} value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" />
                <input type="text" placeholder={t("itemCategory")} value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500">
                  {t("cancel")}
                </button>
                <button onClick={addItem} disabled={!newName.trim()}
                  className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
                  {t("add")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
