import {
  effortWeights,
  learningHeatmap,
  submissionTimeline,
} from "@/data/milestudy-prototype";

import { SectionTitle } from "./SectionTitle";

const intensityStyle: Record<number, string> = {
  0: "bg-slate-100",
  1: "bg-sky-100",
  2: "bg-sky-300",
  3: "bg-sky-500",
  4: "bg-sky-700",
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AnalyticsSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Analytics"
        title="Effort Score, Heatmap, dan Submission Timeline"
        subtitle="Guru dapat melihat kualitas usaha belajar siswa, bukan hanya nilai akhir."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Smart Effort Score</h3>
          <p className="mt-1 text-sm text-slate-600">
            Rumus default: 30% waktu + 20% revisi + 20% konsistensi + 30% nilai.
          </p>

          <ul className="mt-4 space-y-3">
            {effortWeights.map((weight) => (
              <li key={weight.label}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span>{weight.label}</span>
                  <span className="font-semibold">{weight.weight}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${weight.weight}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Learning Heatmap</h3>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {learningHeatmap.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} • intensity ${cell.intensity}`}
                className={`h-6 rounded-md ${intensityStyle[cell.intensity]}`}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Rendah</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={`h-2.5 w-5 rounded ${intensityStyle[level]}`}
                />
              ))}
            </div>
            <span>Tinggi</span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Submission Timeline</h3>
          <ol className="mt-4 space-y-3">
            {submissionTimeline.map((item) => (
              <li key={item.time} className="grid grid-cols-[56px_1fr] gap-2">
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {item.time}
                </span>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{item.action}</p>
                  <p className="text-xs text-slate-600">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  );
}
