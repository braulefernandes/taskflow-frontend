type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Carregando" }: LoadingProps) {
  return (
    <div
      className="inline-flex items-center gap-2 text-sm text-slate-600"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span
        className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
