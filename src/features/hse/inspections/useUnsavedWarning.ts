import { useEffect } from 'react';

export function useUnsavedWarning(unsaved: boolean, message: string) {
  useEffect(() => {
    if (!unsaved) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const links = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (
        !anchor ||
        anchor.href === window.location.href ||
        !anchor.href.startsWith(window.location.origin)
      )
        return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', links, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', links, true);
    };
  }, [unsaved, message]);
}
