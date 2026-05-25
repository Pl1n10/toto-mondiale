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
}

export function SaveBar({ dirtyCount, isSaving, onSave, message }: Props) {
  const disabled = isSaving || dirtyCount === 0;

  const messageColor = {
    info: 'text-gray-600',
    success: 'text-emerald-700',
    error: 'text-red-700',
  }[message?.kind ?? 'info'];

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-col text-sm">
          <span>
            {dirtyCount > 0
              ? `${dirtyCount} row${dirtyCount === 1 ? '' : 's'} modified`
              : 'No changes'}
          </span>
          {message && <span className={`text-xs ${messageColor}`}>{message.text}</span>}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          {isSaving ? 'Saving…' : 'Save predictions'}
        </button>
      </div>
    </div>
  );
}
