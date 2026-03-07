import { lifecycleSteps } from "@/data/milestudy-prototype";

import { SectionTitle } from "./SectionTitle";

export function LifecycleSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Lifecycle"
        title="Alur Kerja End-to-End"
        subtitle="Urutan aktivitas dari login sampai analisis performa siswa dipetakan agar proses belajar terukur."
      />

      <ol className="grid gap-4 lg:grid-cols-2">
        {lifecycleSteps.map((step) => (
          <li
            key={step.order}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {step.order}
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
