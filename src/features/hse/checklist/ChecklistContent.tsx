import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChecklistItem, ChecklistSectionWithItems } from '../../../domain/hse';

interface Props {
  sections: ChecklistSectionWithItems[];
  editable?: boolean;
  onAddItem?(section: ChecklistSectionWithItems): void;
  onEditSection?(section: ChecklistSectionWithItems): void;
  onDeleteSection?(section: ChecklistSectionWithItems): void;
  onEditItem?(item: ChecklistItem): void;
  onDeleteItem?(item: ChecklistItem): void;
}

export function ChecklistContent({
  sections,
  editable = false,
  onAddItem,
  onEditSection,
  onDeleteSection,
  onEditItem,
  onDeleteItem,
}: Props) {
  return (
    <div className="checklist-sections">
      {sections.map((section, index) => (
        <SectionView
          key={section.id}
          section={section}
          number={index + 1}
          editable={editable}
          onAddItem={onAddItem}
          onEditSection={onEditSection}
          onDeleteSection={onDeleteSection}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </div>
  );
}

function SectionView({
  section,
  number,
  editable,
  onAddItem,
  onEditSection,
  onDeleteSection,
  onEditItem,
  onDeleteItem,
}: Omit<Props, 'sections'> & { section: ChecklistSectionWithItems; number: number }) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const name = i18n.language === 'ar' ? section.name_ar : section.name_en;
  const contentId = `checklist-section-${section.id}`;
  return (
    <section className="checklist-section" aria-labelledby={`checklist-heading-${section.id}`}>
      <div className="checklist-section-header">
        <div className="checklist-section-main">
          <span className="checklist-section-number">{number}</span>
          <div>
            <h2 id={`checklist-heading-${section.id}`}>{name}</h2>
            <small>{t('checklistUI.itemCount', { count: section.items.length })}</small>
          </div>
        </div>
        <div className="checklist-actions">
          {editable && (
            <>
              <button type="button" onClick={() => onAddItem?.(section)}>
                {t('checklistUI.addCheckpoint')}
              </button>
              <button type="button" onClick={() => onEditSection?.(section)}>
                {t('checklistUI.editSection')}
              </button>
              <button
                type="button"
                className="checklist-danger-text"
                onClick={() => onDeleteSection?.(section)}
              >
                {t('checklistUI.deleteSection')}
              </button>
            </>
          )}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={contentId}
            aria-label={t(expanded ? 'checklistUI.collapse' : 'checklistUI.expand', { name })}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>
      </div>
      <div id={contentId} className="checklist-section-body" hidden={!expanded}>
        {section.items.length === 0 ? (
          <p className="checklist-empty-item">{t('checklistUI.emptySection')}</p>
        ) : (
          <ol className="checklist-items">
            {section.items.map((item, index) => (
              <li key={item.id}>
                <span className="checklist-item-number">
                  {number}.{index + 1}
                </span>
                <span className="checklist-item-text" lang="en" dir="ltr">
                  {item.check_text_en}
                </span>
                {editable && (
                  <span className="checklist-item-actions">
                    <button
                      type="button"
                      onClick={() => onEditItem?.(item)}
                      aria-label={`${t('checklistUI.editCheckpoint')}: ${item.check_text_en}`}
                    >
                      {t('checklistUI.editCheckpoint')}
                    </button>
                    <button
                      type="button"
                      className="checklist-danger-text"
                      onClick={() => onDeleteItem?.(item)}
                      aria-label={`${t('checklistUI.deleteCheckpoint')}: ${item.check_text_en}`}
                    >
                      {t('checklistUI.deleteCheckpoint')}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
