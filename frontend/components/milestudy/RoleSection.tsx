import { roleCapabilities } from "@/data/milestudy-prototype";

import { SectionTitle } from "./SectionTitle";

const roleStyle: Record<string, string> = {
  admin: "border-sky-200 bg-sky-50",
  teacher: "border-emerald-200 bg-emerald-50",
  student: "border-amber-200 bg-amber-50",
};

export function RoleSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Aktor"
        title="Role & Tanggung Jawab"
        subtitle="Milestudy memiliki tiga aktor utama dengan ruang kerja dan insight yang berbeda."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {roleCapabilities.map((item) => (
          <article
            key={item.role}
            className={`rounded-2xl border p-5 shadow-sm ${roleStyle[item.role]}`}
          >
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-700">{item.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {item.responsibilities.map((responsibility) => (
                <li key={responsibility} className="rounded-lg bg-white/70 px-3 py-2">
                  {responsibility}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
