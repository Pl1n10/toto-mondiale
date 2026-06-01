'use client';

export interface SaveBarMessage {
  kind: 'info' | 'success' | 'error';
  text: string;
}

interface Props {
  dirtyCount: number;
  isSaving: boolean;
  onSave: () => void;
  message?: SaveBarMessage | null;
  /** Optional extra gate (e.g. block save while there are validation conflicts). */
  saveDisabled?: boolean;
}

export function SaveBar({
  dirtyCount,
  isSaving,
  onSave,
  message,
  saveDisabled = false,
}: Props) {
  const disabled = isSaving || dirtyCount === 0 || saveDisabled;

  const messageColor = {
    info: 'text-gray-600',
    success: 'text-emerald-700',
    error: 'text-red-700',
  }[message?.kind ?? 'info'];

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-col text-sm">
          <span className="font-medium text-slate-700">
            {dirtyCount > 0
              ? `${dirtyCount} modific${dirtyCount === 1 ? 'a' : 'he'} da salvare`
              : 'Nessuna modifica'}
          </span>
          {message && <span className={`text-xs ${messageColor}`}>{message.text}</span>}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {isSaving ? 'Salvataggio…' : 'Salva pronostici'}
        </button>
      </div>
    </div>
  );
}
