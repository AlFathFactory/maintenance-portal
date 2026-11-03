import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthProvider';
import { Modal } from '../../shared/ui/Modal';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { useToast } from '../../shared/ui/ToastProvider';

export function LoginModal({ onClose }: { onClose(): void }) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const toast = useToast();
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      await signIn(String(data.get('email')), String(data.get('password')));
      toast.show(t('auth.success'));
      onClose();
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={t('auth.title')} subtitle={t('auth.hint')} onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorMessage error={error} />
        <label>
          {t('auth.email')}
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          {t('auth.password')}
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="primary-button" disabled={pending}>
            {pending ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
