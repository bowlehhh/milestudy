"use client";

import { useMemo, useState } from "react";

import { attendanceRules } from "@/data/milestudy-prototype";
import { AttendanceLevel } from "@/types/milestudy";

import { SectionTitle } from "./SectionTitle";

export function SmartAttendanceSection() {
  const [selectedLevel, setSelectedLevel] = useState<AttendanceLevel>("Productive");
  const [streakCounter, setStreakCounter] = useState(12);

  const selectedRule = useMemo(
    () => attendanceRules.find((rule) => rule.level === selectedLevel),
    [selectedLevel],
  );

  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Attendance"
        title="Smart Attendance by Activity"
        subtitle="Absensi otomatis dicatat dari aktivitas belajar nyata, lalu terintegrasi ke streak dan XP bonus."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Attendance Level Rules</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <th className="py-2 pr-3">Level</th>
                  <th className="py-2 pr-3">Trigger Aktivitas</th>
                  <th className="py-2">Bonus XP</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRules.map((rule) => (
                  <tr
                    key={rule.level}
                    className={`border-b border-slate-100 text-slate-700 ${
                      selectedLevel === rule.level ? "bg-sky-50" : ""
                    }`}
                  >
                    <td className="py-2 pr-3 font-semibold">{rule.level}</td>
                    <td className="py-2 pr-3">{rule.trigger}</td>
                    <td className="py-2">+{rule.xpBonus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Simulasi Kehadiran Harian</h3>

          <div className="mt-4 space-y-2">
            {attendanceRules.map((rule) => (
              <label key={rule.level} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-2">
                <input
                  type="radio"
                  name="attendance-level"
                  checked={selectedLevel === rule.level}
                  onChange={() => setSelectedLevel(rule.level)}
                  className="h-4 w-4 accent-sky-600"
                />
                <span className="text-sm text-slate-700">
                  {rule.level} ({rule.trigger})
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Hasil Otomatis
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Status hari ini: <span className="font-semibold">Present ({selectedLevel})</span>
            </p>
            <p className="text-sm text-slate-700">
              Bonus XP attendance: <span className="font-semibold">+{selectedRule?.xpBonus ?? 0}</span>
            </p>
            <p className="text-sm text-slate-700">
              Dampak streak: <span className="font-semibold">+1 hari jika aktivitas valid</span>
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStreakCounter((current) => current + 1)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Tandai Hadir Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setStreakCounter(0)}
              className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
            >
              Reset Streak
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-700">
            Streak preview: <span className="font-semibold">{streakCounter} hari</span>
          </p>
        </article>
      </div>
    </section>
  );
}
