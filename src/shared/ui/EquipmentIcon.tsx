import type { EquipmentType } from '../../domain/equipment';

export function EquipmentIcon({ type }: { type: EquipmentType }) {
  return (
    <span className={`equipment-icon ${type}`} aria-hidden="true">
      {type === 'crane' ? '♜' : '▤'}
    </span>
  );
}
