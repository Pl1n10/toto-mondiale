interface Props {
  title?: string;
  message: string;
}

export function ErrorState({ title = 'Something went wrong', message }: Props) {
  return (
    <div
      role="alert"
      className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-900"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 whitespace-pre-wrap break-words">{message}</p>
    </div>
  );
}
