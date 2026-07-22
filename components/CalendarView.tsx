"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { supabase, type TimeOff } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile } from "@/context/AuthContext";

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

// Monday-first: 0=Mon … 6=Sun
function startDayOfWeek(y: number, m: number) {
  return (new Date(y, m, 1).getDay() + 6) % 7;
}

const MONTH_NAMES_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Stable color per user based on name hash
const CHIP_COLORS = [
  "bg-orange-400","bg-blue-400","bg-green-500","bg-purple-400",
  "bg-pink-400","bg-teal-500","bg-amber-500","bg-red-400","bg-indigo-400","bg-lime-500",
];
function chipColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) & 0xffff;
  return CHIP_COLORS[hash % CHIP_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function CalendarView({ locale }: { locale: string }) {
  const t = useTranslations("calendar");
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<TimeOff[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // My own add form
  const [myType, setMyType] = useState<"full" | "half">("full");
  const [myNote, setMyNote] = useState("");
  const [mySaving, setMySaving] = useState(false);

  // Admin add form
  const [adminUserId, setAdminUserId] = useState("");
  const [adminType, setAdminType] = useState<"full" | "half">("full");
  const [adminNote, setAdminNote] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const from = isoDate(year, month, 1);
    const to = isoDate(year, month, daysInMonth(year, month));
    const { data } = await supabase
      .from("time_off").select("*")
      .gte("date", from).lte("date", to).order("date");
    setEntries(data || []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("user_profiles").select("*").eq("approved", true).order("full_name")
      .then(({ data }) => setUsers(data || []));
  }, [isAdmin]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  function selectDay(dateStr: string) {
    if (selectedDate === dateStr) { setSelectedDate(null); return; }
    setSelectedDate(dateStr);
    setMyNote(""); setAdminNote(""); setAdminUserId("");
    const myEntry = entries.find(e => e.date === dateStr && e.user_id === profile?.id);
    setMyType(myEntry?.type ?? "full");
    setMyNote(myEntry?.note ?? "");
  }

  async function toggleMyDay() {
    if (!profile || !selectedDate) return;
    setMySaving(true);
    const myEntries = entries.filter(e => e.date === selectedDate && e.user_id === profile.id);
    if (myEntries.length > 0) {
      await supabase.from("time_off").delete().in("id", myEntries.map(e => e.id));
    } else {
      await supabase.from("time_off").insert({
        user_id: profile.id,
        user_name: profile.full_name || profile.email || "—",
        date: selectedDate, type: myType,
        note: myNote.trim() || null,
      });
    }
    setMySaving(false);
    await loadEntries();
  }

  async function addAdminEntry() {
    if (!adminUserId || !selectedDate) return;
    setAdminSaving(true);
    const targetUser = users.find(u => u.id === adminUserId);
    // Remove existing entries for this user on this day first
    const existing = entries.filter(e => e.date === selectedDate && e.user_id === adminUserId);
    if (existing.length > 0) {
      await supabase.from("time_off").delete().in("id", existing.map(e => e.id));
    }
    await supabase.from("time_off").insert({
      user_id: adminUserId,
      user_name: targetUser?.full_name || targetUser?.email || "—",
      date: selectedDate, type: adminType,
      note: adminNote.trim() || null,
    });
    setAdminUserId(""); setAdminNote("");
    setAdminSaving(false);
    await loadEntries();
  }

  async function removeEntry(id: string) {
    await supabase.from("time_off").delete().eq("id", id);
    await loadEntries();
  }

  const days = daysInMonth(year, month);
  const startOffset = startDayOfWeek(year, month);
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const weekdays = t.raw("weekdays") as string[];
  const monthNames = locale === "de" ? MONTH_NAMES_DE : MONTH_NAMES_EN;

  const byDate = new Map<string, TimeOff[]>();
  entries.forEach(e => {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  });

  const selectedEntries = selectedDate ? (byDate.get(selectedDate) ?? []) : [];
  const myEntries = selectedDate ? entries.filter(e => e.date === selectedDate && e.user_id === profile?.id) : [];
  const hasMyEntry = myEntries.length > 0;

  return (
    <div className="space-y-4 pb-24 sm:pb-8">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all text-xl">
          ‹
        </button>
        <span className="text-base font-semibold text-gray-800">{monthNames[month]} {year}</span>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all text-xl">
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {weekdays.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`e${i}`} className="border-b border-r border-gray-50 min-h-[60px]" />
          ))}

          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const dateStr = isoDate(year, month, day);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            const dayEntries = byDate.get(dateStr) ?? [];
            const col = (startOffset + i) % 7;
            const isWeekend = col === 5 || col === 6;
            const isLastCol = (startOffset + i + 1) % 7 === 0;

            return (
              <button
                key={dateStr}
                onClick={() => selectDay(dateStr)}
                className={`relative flex flex-col items-start p-1 border-b min-h-[60px] transition-colors text-left
                  ${isLastCol ? "" : "border-r"} border-gray-100
                  ${isSelected ? "bg-gray-900" : isWeekend ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"}
                `}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold leading-none mb-1 w-5 h-5 flex items-center justify-center rounded-full
                  ${isSelected ? "bg-white text-gray-900" :
                    isToday ? "bg-blue-600 text-white" :
                    isWeekend ? "text-gray-400" : "text-gray-700"}
                `}>
                  {day}
                </span>

                {/* Name chips */}
                <div className="flex flex-col gap-0.5 w-full">
                  {dayEntries.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold text-white leading-none truncate
                        ${e.type === "half" ? "opacity-70" : ""}
                        ${chipColor(e.user_id)}
                        ${isSelected ? "opacity-90" : ""}
                      `}
                      title={e.user_name}
                    >
                      <span className="truncate">{initials(e.user_name)}</span>
                      {e.type === "half" && <span className="opacity-80">½</span>}
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <span className={`text-[9px] font-medium px-1 ${isSelected ? "text-gray-400" : "text-gray-400"}`}>
                      +{dayEntries.length - 3}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                locale === "de" ? "de-DE" : "en-US",
                { weekday: "long", day: "numeric", month: "long" }
              )}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Who's off */}
            {selectedEntries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">{t("noOneOff")}</p>
            ) : (
              <div className="space-y-2">
                {selectedEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${chipColor(e.user_id)}`}>
                      {initials(e.user_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{e.user_name}</p>
                      {e.note && <p className="text-xs text-gray-400 truncate">{e.note}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      e.type === "half" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {e.type === "half" ? t("half") : t("full")}
                    </span>
                    {(isAdmin || e.user_id === profile?.id) && (
                      <button
                        onClick={() => removeEntry(e.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* My own add/remove */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("myDayOff")}</p>
              {!hasMyEntry && (
                <>
                  {/* Type toggle */}
                  <div className="flex gap-2">
                    <button onClick={() => setMyType("full")} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${myType === "full" ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {t("full")}
                    </button>
                    <button onClick={() => setMyType("half")} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${myType === "half" ? "bg-amber-500 text-white border-amber-500" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {t("half")}
                    </button>
                  </div>
                  <input
                    type="text" placeholder={t("addNote")} value={myNote}
                    onChange={(e) => setMyNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  <button onClick={toggleMyDay} disabled={mySaving} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                    {mySaving ? "..." : t("myDayOff")}
                  </button>
                </>
              )}
              {hasMyEntry && (
                <button onClick={toggleMyDay} disabled={mySaving} className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {mySaving ? "..." : t("remove")}
                </button>
              )}
            </div>

            {/* Admin section */}
            {isAdmin && (
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("adminSection")}</p>
                <select
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 text-gray-700"
                >
                  <option value="">{t("selectEmployee")}</option>
                  {users.filter(u => u.id !== profile?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
                {adminUserId && (
                  <>
                    <div className="flex gap-2">
                      <button onClick={() => setAdminType("full")} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${adminType === "full" ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {t("full")}
                      </button>
                      <button onClick={() => setAdminType("half")} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${adminType === "half" ? "bg-amber-500 text-white border-amber-500" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {t("half")}
                      </button>
                    </div>
                    <input
                      type="text" placeholder={t("addNote")} value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <button onClick={addAdminEntry} disabled={adminSaving} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                      {adminSaving ? "..." : t("addForEmployee")}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
