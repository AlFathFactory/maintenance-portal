import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  title: string;
  subtitle?: string;
  onClose(): void;
  children: ReactNode;
}

export function Modal({ title, subtitle, onClose, children }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          ×
        </button>
        <h2>{title}</h2>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
