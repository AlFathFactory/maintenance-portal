interface Props {
  name: string;
  phone: string | null | undefined;
}

function dialableNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const value = phone.trim();
  if (!/^\+?[\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return `${value.startsWith('+') ? '+' : ''}${digits}`;
}

export function CallButton({ name, phone }: Props) {
  const { t } = useTranslation();
  const number = dialableNumber(phone);
  if (!number) return null;

  return (
    <a
      className="teams-call"
      href={`tel:${number}`}
      aria-label={t('teams.callLabel', { name, phone: phone?.trim() })}
      title={t('teams.callTitle', { name, phone: phone?.trim() })}
      onClick={(event) => event.stopPropagation()}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 16.4v3a2 2 0 0 1-2.2 2A18 18 0 0 1 2.6 5.2 2 2 0 0 1 4.6 3h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.8L7.7 11a14 14 0 0 0 5.3 5.3l1.7-1.8a2 2 0 0 1 1.8-.6l2.8.5a2 2 0 0 1 1.7 2Z" />
      </svg>
    </a>
  );
}
import { useTranslation } from 'react-i18next';
