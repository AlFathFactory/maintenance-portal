import { useTranslation } from 'react-i18next';
import type { Checklist, InspectionResultValue } from '../../../domain/hse';
import type { AnswerMap, CommentMap } from './inspectionModel';

const choices: InspectionResultValue[] = ['OK', 'Faulty', 'N/A'];

export function InspectionChecklist({
  checklist,
  answers,
  comments,
  editable,
  onAnswer,
  onComment,
}: {
  checklist: Checklist;
  answers: AnswerMap;
  comments: CommentMap;
  editable: boolean;
  onAnswer?(itemId: string, result: InspectionResultValue): void;
  onComment?(sectionId: string, value: string): void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="inspection-sections">
      {checklist.sections.map((section, sectionIndex) => {
        const name = i18n.language === 'ar' ? section.name_ar : section.name_en;
        const completed = section.items.filter((item) => Boolean(answers[item.id])).length;
        return (
          <section
            className="inspection-section"
            key={section.id}
            aria-labelledby={`inspection-section-${section.id}`}
          >
            <div className="inspection-section-heading">
              <span>{sectionIndex + 1}</span>
              <div>
                <h2 id={`inspection-section-${section.id}`}>{name}</h2>
                <small>
                  {completed} / {section.items.length} {t('inspectionUI.completed')}
                </small>
              </div>
            </div>
            <div className="inspection-section-items">
              {section.items.map((item, itemIndex) => (
                <fieldset key={item.id} className="inspection-checkpoint">
                  <legend>
                    <span>
                      {sectionIndex + 1}.{itemIndex + 1}
                    </span>{' '}
                    <span lang="en" dir="ltr">
                      {item.check_text_en}
                    </span>
                  </legend>
                  {editable ? (
                    <div className="inspection-result-options">
                      {choices.map((choice) => (
                        <label
                          key={choice}
                          className={answers[item.id] === choice ? 'selected' : ''}
                        >
                          <input
                            type="radio"
                            name={`result-${item.id}`}
                            value={choice}
                            checked={answers[item.id] === choice}
                            onChange={() => onAnswer?.(item.id, choice)}
                          />
                          {choice}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={`inspection-result inspection-result-${answers[item.id]?.replace('/', '') ?? 'unanswered'}`}
                    >
                      {answers[item.id] ?? t('inspectionUI.unanswered')}
                    </span>
                  )}
                </fieldset>
              ))}
              {section.items.length === 0 && <p>{t('checklistUI.emptySection')}</p>}
            </div>
            <div className="inspection-comment">
              <label htmlFor={`comment-${section.id}`}>{t('inspectionUI.comments')}</label>
              {editable ? (
                <textarea
                  id={`comment-${section.id}`}
                  rows={3}
                  value={comments[section.id] ?? ''}
                  onChange={(event) => onComment?.(section.id, event.target.value)}
                />
              ) : (
                <p id={`comment-${section.id}`}>
                  {comments[section.id] || t('inspectionUI.noComments')}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
