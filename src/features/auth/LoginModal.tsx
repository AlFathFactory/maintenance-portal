import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';
import { Modal } from '../../shared/ui/Modal';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { useToast } from '../../shared/ui/ToastProvider';

export function LoginModal({ onClose }: { onClose(): void }) {
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
      toast.show('تم الدخول بنجاح');
      onClose();
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      title="دخول مسؤول الصيانة"
      subtitle="استخدم حساب القسم المسجل في Supabase."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <ErrorMessage error={error} />
        <label>
          البريد الإلكتروني
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          كلمة المرور
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            إلغاء
          </button>
          <button className="primary-button" disabled={pending}>
            {pending ? 'جارٍ الدخول...' : 'دخول'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
