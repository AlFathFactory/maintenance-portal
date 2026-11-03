import { statusDetails, type EquipmentStatus } from '../../domain/equipment';
import { useTranslation } from 'react-i18next';

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  const { t } = useTranslation();
  const details = statusDetails[status] ?? statusDetails.unknown;
  return (
    <span className={`badge ${details.tone}`}>
      <i />
      {t(`status.${status}`)}
    </span>
  );
}
