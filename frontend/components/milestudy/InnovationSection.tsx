import {
  adaptiveDeadlineRules,
  difficultySignals,
  innovationCards,
} from "@/data/milestudy-prototype";

import { SectionTitle } from "./SectionTitle";

export function InnovationSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Inovasi"
        title="Ghost Mode, AI Difficulty, dan Adaptive Deadline"
        subtitle="Fitur pembeda Milestudy untuk membantu siswa belajar efektif dan membantu guru mengatur kompleksitas tugas secara data-driven."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {innovationCards.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {card.highlights.map((highlight) => (
                <li key={highlight} className="rounded-lg bg-slate-50 px-3 py-2">
                  {highlight}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">AI Difficulty Detector</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <th className="py-2 pr-3">Tugas</th>
                  <th className="py-2 pr-3">Rata-rata Nilai</th>
                  <th className="py-2 pr-3">Low Score Share</th>
                  <th className="py-2">Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                {difficultySignals.map((signal) => (
                  <tr key={signal.assignment} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-3 font-semibold">{signal.assignment}</td>
                    <td className="py-2 pr-3">{signal.averageScore}</td>
                    <td className="py-2 pr-3">{signal.lowScoreShare}%</td>
                    <td className="py-2">{signal.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Adaptive Deadline Rules</h3>
          <ul className="mt-4 space-y-3">
            {adaptiveDeadlineRules.map((rule) => (
              <li key={rule.student} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{rule.student}</p>
                <p className="mt-1 text-xs text-slate-600">{rule.reason}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Konsistensi: {rule.consistency}%</span>
                  <span>Extension: +{rule.extensionHours} jam</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
