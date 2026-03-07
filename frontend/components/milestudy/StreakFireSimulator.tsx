"use client";

import { useMemo, useState } from "react";

import { streakMilestones } from "@/data/milestudy-prototype";

import { SectionTitle } from "./SectionTitle";

function getFireLevel(days: number) {
  const achieved = streakMilestones.filter((milestone) => days >= milestone.days);

  if (achieved.length === 0) {
    return 0;
  }

  return achieved[achieved.length - 1].fireLevel;
}

export function StreakFireSimulator() {
  const [streakDays, setStreakDays] = useState(9);
  const [todayDone, setTodayDone] = useState(false);

  const currentMilestone = useMemo(() => {
    const achieved = streakMilestones.filter((milestone) => streakDays >= milestone.days);
    return achieved[achieved.length - 1] ?? null;
  }, [streakDays]);

  const nextMilestone = useMemo(
    () => streakMilestones.find((milestone) => milestone.days > streakDays) ?? null,
    [streakDays],
  );

  const fireLevel = getFireLevel(streakDays);

  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Streak"
        title="Fire Animation Simulator"
        subtitle="Setiap aktivitas belajar harian akan menaikkan streak dan memicu animasi saat mencapai milestone."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Status Streak Siswa</h3>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
              longest_streak: 112 hari
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <div
              className={`fire-orb fire-level-${fireLevel} ${
                fireLevel > 0 ? "fire-pulse" : ""
              }`}
              aria-hidden="true"
            >
              <span>FIRE</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Streak Saat Ini
              </p>
              <p className="text-4xl font-semibold text-slate-900">{streakDays} hari</p>
              <p className="mt-1 text-sm text-slate-600">
                {currentMilestone
                  ? `${currentMilestone.label}: ${currentMilestone.rewardText}`
                  : "Belum mencapai milestone. Mulai aktivitas harian untuk menyalakan fire."}
              </p>
            </div>
          </div>

          <div className="mt-5 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
              style={{ width: `${Math.min((streakDays / 30) * 100, 100)}%` }}
            />
          </div>

          <div className="mt-2 text-xs text-slate-600">
            {nextMilestone
              ? `Milestone berikutnya: ${nextMilestone.days} hari (${nextMilestone.label}).`
              : "Semua milestone telah tercapai."}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (todayDone) {
                  return;
                }

                setStreakDays((current) => current + 1);
                setTodayDone(true);
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={todayDone}
            >
              Catat Aktivitas Hari Ini
            </button>
            <button
              type="button"
              onClick={() => {
                setTodayDone(false);
                setStreakDays(0);
              }}
              className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
            >
              Simulasikan 1 Hari Tanpa Aktivitas
            </button>
            <button
              type="button"
              onClick={() => setTodayDone(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Ganti ke Hari Berikutnya
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Milestone Streak</h3>
          <ul className="mt-4 space-y-2">
            {streakMilestones.map((milestone) => {
              const unlocked = streakDays >= milestone.days;

              return (
                <li
                  key={milestone.days}
                  className={`rounded-xl border p-3 ${
                    unlocked
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {milestone.days} hari - {milestone.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{milestone.rewardText}</p>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
