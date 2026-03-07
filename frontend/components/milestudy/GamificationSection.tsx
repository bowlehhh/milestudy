import { leaderboard, notifications } from "@/data/milestudy-prototype";

import { SectionTitle } from "./SectionTitle";

export function GamificationSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Gamification"
        title="XP, Rank, Leaderboard, dan Notifikasi"
        subtitle="Skor tugas berdampak langsung ke XP, posisi rank, serta notifikasi progres siswa."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Leaderboard Kelas</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Update realtime setelah grading
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <th className="py-2 pr-2">Rank</th>
                  <th className="py-2 pr-2">Siswa</th>
                  <th className="py-2 pr-2">XP</th>
                  <th className="py-2 pr-2">Streak</th>
                  <th className="py-2">Effort Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item) => (
                  <tr key={item.rank} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-2 font-semibold">#{item.rank}</td>
                    <td className="py-2 pr-2">{item.name}</td>
                    <td className="py-2 pr-2">{item.xp}</td>
                    <td className="py-2 pr-2">{item.streak} hari</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${item.effortScore}%` }}
                          />
                        </div>
                        <span>{item.effortScore}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Feed Notifikasi</h3>
          <ul className="mt-4 space-y-3">
            {notifications.map((item) => (
              <li key={`${item.type}-${item.time}`} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">
                  {item.type} • {item.time}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.body}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
