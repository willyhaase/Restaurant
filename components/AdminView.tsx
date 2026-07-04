"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase, type KitchenType, type PrepItemTemplate, localizedName } from "@/lib/supabase";
import type { UserProfile, UserRole } from "@/context/AuthContext";

export default function AdminView({ locale }: { locale: string }) {
  const t = useTranslations("admin");
  const tK = useTranslations("kitchen");

  const [tab, setTab] = useState<"items" | "users" | "pending">("items");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [items, setItems] = useState<PrepItemTemplate[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New item form
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameDe, setNewNameDe] = useState("");
  const [newKitchen, setNewKitchen] = useState<KitchenType>("hot");
  const [newFull, setNewFull] = useState("");
  const [newHalf, setNewHalf] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: u }, { data: i }] = await Promise.all([
      supabase.from("user_profiles").select("*").order("full_name"),
      supabase.from("prep_item_templates").select("*").eq("active", true).order("name"),
    ]);
    setUsers(u || []);
    setItems(i || []);
    setLoading(false);
  }

  async function approveUser(userId: string) {
    setSavingId(userId);
    await supabase.from("user_profiles").update({ approved: true }).eq("id", userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, approved: true } : u));
    setSavingId(null);
  }

  async function updateRole(userId: string, role: UserRole) {
    setSavingId(userId);
    await supabase.from("user_profiles").update({ role }).eq("id", userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    setSavingId(null);
  }

  async function toggleActive(item: PrepItemTemplate) {
    await supabase.from("prep_item_templates").update({ active: !item.active }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, active: !i.active } : i));
  }

  async function addItem() {
    const baseName = newNameDe.trim() || newNameEn.trim();
    if (!baseName || !newFull.trim()) return;
    const { data } = await supabase
      .from("prep_item_templates")
      .insert({ name: baseName, name_en: newNameEn.trim() || baseName, name_de: newNameDe.trim() || baseName,
        kitchen_type: newKitchen, full_quantity: newFull.trim(), half_quantity: newHalf.trim(), unit: "", active: true })
      .select().single();
    if (data) setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewNameEn(""); setNewNameDe(""); setNewFull(""); setNewHalf("");
  }

  const ROLES: UserRole[] = ["admin", "chef", "assistant"];

  if (loading) {
    return <div className="flex justify-center py-20 text-gray-400">⏳</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-100 p-1 gap-1">
        {(["items", "users", "pending"] as const).map((tab_) => (
          <button
            key={tab_}
            onClick={() => setTab(tab_)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === tab_ ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {tab_ === "items" ? t("prepItems") : tab_ === "users" ? t("users") : t("pending")}
          </button>
        ))}
      </div>

      {tab === "pending" && (() => {
        const pending = users.filter((u) => !u.approved);
        return (
          <div className="space-y-2">
            {pending.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">{t("noPending")}</p>
            ) : pending.map((user) => (
              <div key={user.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{user.full_name || "—"}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => approveUser(user.id)}
                    disabled={savingId === user.id}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium bg-green-500 text-white disabled:opacity-50"
                  >
                    {savingId === user.id ? t("approving") : t("approve")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {tab === "users" && (
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {user.full_name || "—"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                {savingId === user.id ? (
                  <span className="text-xs text-gray-400">{t("saving")}</span>
                ) : (
                  <div className="flex gap-1 flex-shrink-0">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => updateRole(user.id, r)}
                        className={`text-xs px-2 py-1 rounded-lg font-medium border transition-all ${
                          user.role === r
                            ? r === "admin"
                              ? "bg-purple-500 text-white border-purple-500"
                              : r === "chef"
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-blue-500 text-white border-blue-500"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {t(`roles.${r}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "items" && (
        <div className="space-y-3">
          {/* Add new item */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex gap-2">
              {(["hot", "cold"] as KitchenType[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setNewKitchen(k)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                    newKitchen === k
                      ? k === "hot" ? "bg-orange-500 text-white border-orange-500" : "bg-blue-500 text-white border-blue-500"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}
                >
                  {tK(k)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text" placeholder={`${t("itemName")} (EN)`} value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                type="text" placeholder={`${t("itemName")} (DE)`} value={newNameDe}
                onChange={(e) => setNewNameDe(e.target.value)}
                className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text" placeholder={t("fullQty")} value={newFull}
                onChange={(e) => setNewFull(e.target.value)}
                className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                type="text" placeholder={t("halfQty")} value={newHalf}
                onChange={(e) => setNewHalf(e.target.value)}
                className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <button
              onClick={addItem}
              disabled={!(newNameDe.trim() || newNameEn.trim()) || !newFull.trim()}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              {t("addItem")}
            </button>
          </div>

          {/* Items list */}
          {(["hot", "cold"] as KitchenType[]).map((kitchen) => {
            const kitchenItems = items.filter((i) => i.kitchen_type === kitchen);
            if (!kitchenItems.length) return null;
            return (
              <div key={kitchen}>
                <h3 className={`font-bold text-sm px-1 mb-2 ${kitchen === "hot" ? "text-orange-600" : "text-blue-600"}`}>
                  {tK(kitchen)}
                </h3>
                <div className={`rounded-2xl border overflow-hidden divide-y ${kitchen === "hot" ? "border-orange-200 divide-orange-100" : "border-blue-200 divide-blue-100"}`}>
                  {kitchenItems.map((item) => (
                    <div key={item.id} className="bg-white flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{localizedName(item, locale)}</p>
                        <p className="text-xs text-gray-400">{item.full_quantity} / {item.half_quantity}</p>
                      </div>
                      <button
                        onClick={() => toggleActive(item)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                          item.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {item.active ? "✓" : "✗"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
