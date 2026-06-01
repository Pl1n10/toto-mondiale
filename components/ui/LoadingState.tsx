interface Props {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: Props) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 py-6 text-sm text-slate-500"
    >
      <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
      <span>{label}</span>
    </div>
  );
}
