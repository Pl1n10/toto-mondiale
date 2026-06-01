interface Props {
  /** Override the default Italian message — handy if a future stage needs
   *  a more specific reason ("torneo concluso", "in attesa che l'admin
   *  compili il Round of 32", ...). */
  message?: string;
}

export function LockBanner({ message }: Props) {
  const text =
    message ??
    'Schedina lockata — modifiche disabilitate. Riapri quando l\'admin sblocca la fase.';
  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <span aria-hidden>🔒</span>
      <span>{text}</span>
    </div>
  );
}
