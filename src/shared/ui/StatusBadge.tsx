import { statusDetails, type EquipmentStatus } from '../../domain/equipment';

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  const details = statusDetails[status] ?? statusDetails.unknown;
  return (
    <span className={`badge ${details.tone}`}>
      <i />
      {details.label}
    </span>
  );
}
