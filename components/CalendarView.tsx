"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { supabase, type TimeOff } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

// Monday-first: 0=Mon … 6=Sun
function startDayOfWeek(y: number, m: number) {
  const d = new Date(y, m, 1).getDay(); // 0=Sun
  return (d + 6) % 7;
}

const MONTH_NAMES_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default function CalendarView({ locale }: { locale: string }) {
  const t = useTranslations("calendar");
  const { profile } = useAuth();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const from = isoDate(year, month, 1);
    const to = isoDate(year, month, daysInMonth(year, month));
    const { data } = await supabase
      .from("time_off")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date");
    setEntries(data || []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

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
    const myEntry = entries.find(e => e.date === dateStr && e.user_id === profile?.id);
    setNote(myEntry?.note ?? "");
  }

  async function toggleMyDay() {
    if (!profile || !selectedDate) return;
    setSaving(true);
    const myEntry = entries.find(e => e.date === selectedDate && e.user_id === profile.id);
    if (myEntry) {
      await supabase.from("time_off").delete().eq("id", myEntry.id);
    } else {
      await supabase.from("time_off").insert({
        user_id: profile.id,
        user_name: profile.full_name || profile.email || "—",
        date: selectedDate,
        note: note.trim() || null,
      });
    }
    setSaving(false);
    await loadEntries();
  }

  async function updateNote() {
    if (!profile || !selectedDate) return;
    const myEntry = entries.find(e => e.date === selectedDate && e.user_id === profile.id);
    if (!myEntry) return;
    setSaving(true);
    await supabase.from("time_off").update({ note: note.trim() || null }).eq("id", myEntry.id);
    setSaving(false);
    await loadEntries();
  }

  const days = daysInMonth(year, month);
  const startOffset = startDayOfWeek(year, month);
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const weekdays = t.raw("weekdays") as string[];
  const monthNames = locale === "de" ? MONTH_NAMES_DE : MONTH_NAMES_EN;

  // Group entries by date
  const byDate = new Map<string, TimeOff[]>();
  entries.forEach(e => {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  });

  const selectedEntries = selectedDate ? (byDate.get(selectedDate) ?? []) : [];
  const myEntryForSelected = selectedDate ? entries.find(e => e.date === selectedDate && e.user_id === profile?.id) : null;

  return (
    <div className="space-y-4 pb-24 sm:pb-8">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
        >
          ‹
        </button>
        <span className="text-base font-semibold text-gray-800">
          {monthNames[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekdays.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square border-b border-r border-gray-50" />
          ))}

          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const dateStr = isoDate(year, month, day);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            const dayEntries = byDate.get(dateStr) ?? [];
            const hasMyEntry = dayEntries.some(e => e.user_id === profile?.id);
            const col = (startOffset + i) % 7; // 5=Sat, 6=Sun
            const isWeekend = col === 5 || col === 6;

            return (
              <button
                key={dateStr}
                onClick={() => selectDay(dateStr)}
                className={`relative aspect-square flex flex-col items-center pt-1.5 pb-1 border-b border-r transition-colors
                  ${isSelected ? "bg-gray-900" : isWeekend ? "bg-gray-50/60 hover:bg-gray-100" : "hover:bg-gray-50"}
                  ${(startOffset + i + 1) % 7 === 0 ? "border-r-0" : "border-gray-100"}
                `}
              >
                <span className={`text-xs font-semibold leading-none mb-1
                  ${isSelected ? "text-white" :
                    isToday ? "text-blue-600" :
                    isWeekend ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  {day}
                </span>
                {/* Off-day dots */}
                {dayEntries.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 px-0.5">
                    {dayEntries.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          e.user_id === profile?.id
                            ? isSelected ? "bg-white" : "bg-gray-900"
                            : isSelected ? "bg-gray-300" : "bg-gray-400"
                        }`}
                      />
                    ))}
                    {dayEntries.length > 3 && (
                      <span className={`text-[8px] leading-none ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                        +{dayEntries.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString(
              locale === "de" ? "de-DE" : "en-US",
              { weekday: "long", day: "numeric", month: "long" }
            )}
          </p>

          {/* Who's off */}
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-gray-400">{t("noOneOff")}</p>
          ) : (
            <div className="space-y-1.5">
              {selectedEntries.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.user_id === profile?.id ? "bg-gray-900" : "bg-gray-400"}`} />
                  <span className="text-sm text-gray-700 font-medium">{e.user_name}</span>
                  {e.note && <span className="text-xs text-gray-400">· {e.note}</span>}
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t("offToday")}</span>
                </div>
              ))}
            </div>
          )}

          {/* My action */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {!myEntryForSelected && (
              <input
                type="text"
                placeholder={t("addNote")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            )}
            {myEntryForSelected && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("addNote")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <button
                  onClick={updateNote}
                  disabled={saving}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {t("save")}
                </button>
              </div>
            )}
            <button
              onClick={toggleMyDay}
              disabled={saving}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                myEntryForSelected
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-gray-900 text-white"
              }`}
            >
              {saving ? "..." : myEntryForSelected ? t("remove") : t("myDayOff")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
