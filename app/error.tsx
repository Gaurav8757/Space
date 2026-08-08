'use client';

interface ErrorBoundaryProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function GlobalErrorPage({
  error,
  reset,
}: ErrorBoundaryProps) {
  return (
    <div className="error">
      <h2>Something went wrong!</h2>
      {error?.digest && (
        <p className="text-xs font-mono text-slate-400">Error Digest: {error.digest}</p>
      )}
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
