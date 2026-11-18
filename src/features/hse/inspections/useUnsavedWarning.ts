import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedWarning(unsaved: boolean, message: string) {
  const blocker = useBlocker(unsaved);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(message)) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);

  useEffect(() => {
    if (!unsaved) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', unload);
    return () => {
      window.removeEventListener('beforeunload', unload);
    };
  }, [unsaved]);
}
