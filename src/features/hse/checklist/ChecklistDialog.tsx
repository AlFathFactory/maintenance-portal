import { useEffect, useRef, type ReactNode } from 'react';
import { Modal } from '../../../shared/ui/Modal';

export function ChecklistDialog({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose(): void;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = content.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]',
        ),
      );
    (
      dialog.querySelector<HTMLElement>('input:not(:disabled), textarea:not(:disabled)') ??
      focusables()[0]
    )?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusables();
      if (!elements.length) return;
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', trap);
    return () => {
      dialog.removeEventListener('keydown', trap);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <div ref={content}>{children}</div>
    </Modal>
  );
}
