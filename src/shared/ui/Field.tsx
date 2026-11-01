import type { ReactNode } from 'react';

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="field">
      <span>{label}</span>
      <strong>{value || <span className="empty-value">غير مسجل</span>}</strong>
    </div>
  );
}
