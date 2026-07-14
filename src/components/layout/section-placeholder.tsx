type SectionPlaceholderProps = { title: string; description: string };

export function SectionPlaceholder({ title, description }: SectionPlaceholderProps) {
  return <section aria-labelledby="section-title"><p className="text-sm font-semibold text-indigo-600">TaskFlow</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl" id="section-title">{title}</h1><div className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-600">{description}</p></div></section>;
}
