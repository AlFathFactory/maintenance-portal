export function ErrorMessage({ error, retry }: { error: unknown; retry?(): void }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="error-banner" role="alert">
      {message}
      {retry && <button onClick={retry}>إعادة المحاولة</button>}
    </div>
  );
}
