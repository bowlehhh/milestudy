interface SectionTitleProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export function SectionTitle({ eyebrow, title, subtitle }: SectionTitleProps) {
  return (
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
      <p className="max-w-3xl text-sm text-slate-600 sm:text-base">{subtitle}</p>
    </header>
  );
}
