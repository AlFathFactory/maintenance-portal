import { useTranslation } from 'react-i18next';
import type { ChainLegCount, ChainUpdateInput } from '../../../domain/hse';
import { legOptions } from './chainPresentation';

export interface ChainFieldValue {
  number_of_legs: ChainLegCount;
  working_load_limit_tons: string;
  length_m: string;
  start_working_date: string;
}

export function emptyChainFields(): ChainFieldValue {
  return { number_of_legs: 1, working_load_limit_tons: '', length_m: '', start_working_date: '' };
}

export function toChainFields(value: ChainUpdateInput): ChainFieldValue {
  return {
    ...value,
    working_load_limit_tons: String(value.working_load_limit_tons),
    length_m: String(value.length_m),
  };
}

export function chainFieldInput(value: ChainFieldValue): ChainUpdateInput {
  return {
    number_of_legs: value.number_of_legs,
    working_load_limit_tons: Number(value.working_load_limit_tons),
    length_m: Number(value.length_m),
    start_working_date: value.start_working_date,
  };
}

export function ChainFields({
  value,
  onChange,
  disabled = false,
}: {
  value: ChainFieldValue;
  onChange(value: ChainFieldValue): void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="chain-form-grid">
      <label>
        {t('chainUI.legs')}
        <select
          value={value.number_of_legs}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, number_of_legs: Number(event.target.value) as ChainLegCount })
          }
        >
          {legOptions.map((legs) => (
            <option key={legs} value={legs}>
              {legs}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('chainUI.wll')}
        <input
          type="number"
          min="0.001"
          step="any"
          inputMode="decimal"
          required
          disabled={disabled}
          value={value.working_load_limit_tons}
          onChange={(event) => onChange({ ...value, working_load_limit_tons: event.target.value })}
        />
      </label>
      <label>
        {t('chainUI.length')}
        <input
          type="number"
          min="0.001"
          step="any"
          inputMode="decimal"
          required
          disabled={disabled}
          value={value.length_m}
          onChange={(event) => onChange({ ...value, length_m: event.target.value })}
        />
      </label>
      <label>
        {t('chainUI.startDate')}
        <input
          type="date"
          required
          disabled={disabled}
          value={value.start_working_date}
          onChange={(event) => onChange({ ...value, start_working_date: event.target.value })}
        />
      </label>
    </div>
  );
}
