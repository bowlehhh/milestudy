import { prototypeKpis, stackTags } from "@/data/milestudy-prototype";

import { ApiStatusCard } from "./ApiStatusCard";

export function HeroSection() {
  return (
    <section className="grid gap-6 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-6 shadow-sm sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
      <div className="space-y-4">
        <p className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Prototype Sistem Milestudy
        </p>

        <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
          Smart LMS dengan Gamification, Learning Analytics, dan Smart Attendance
        </h1>

        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          Halaman ini adalah prototipe komponen inti Milestudy: manajemen kelas,
          tugas fleksibel, XP + rank, streak fire animation, effort score,
          heatmap, dan analytics untuk guru.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {stackTags.map((tag) => (
            <span
              key={tag.label}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
            >
              {tag.label}: {tag.value}
            </span>
          ))}
        </div>
      </div>

      <ApiStatusCard />

      <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
        {prototypeKpis.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
            <p className="mt-2 text-xs text-slate-600">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
