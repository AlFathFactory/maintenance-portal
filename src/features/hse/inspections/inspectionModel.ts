import type {
  Checklist,
  ChainInspection,
  InspectionDetails,
  InspectionResultValue,
} from '../../../domain/hse';

export type AnswerMap = Record<string, InspectionResultValue | undefined>;
export type CommentMap = Record<string, string>;

export function savedAnswers(details: InspectionDetails): AnswerMap {
  return Object.fromEntries(details.results.map((row) => [row.item_id, row.result]));
}

export function savedComments(details: InspectionDetails): CommentMap {
  return Object.fromEntries(
    details.comments.map((row) => [row.section_id, row.comments_corrective_actions]),
  );
}

export function inspectionProgress(checklist: Checklist, answers: AnswerMap) {
  const ids = checklist.sections.flatMap((section) => section.items.map((item) => item.id));
  const counts = { total: ids.length, completed: 0, unanswered: 0, OK: 0, Faulty: 0, 'N/A': 0 };
  for (const id of ids) {
    const value = answers[id];
    if (value === 'OK' || value === 'Faulty' || value === 'N/A') {
      counts.completed++;
      counts[value]++;
    } else counts.unanswered++;
  }
  return counts;
}

export function canEditInspection(
  record: ChainInspection,
  userId: string | null,
  signed: boolean,
): boolean {
  return record.status === 'draft' && record.inspector_id === userId && !signed;
}

export function changedAnswers(
  checklist: Checklist,
  current: AnswerMap,
  persisted: AnswerMap,
): Array<{ itemId: string; result: InspectionResultValue }> {
  return checklist.sections.flatMap((section) =>
    section.items.flatMap((item) => {
      const value = current[item.id];
      return value && value !== persisted[item.id] ? [{ itemId: item.id, result: value }] : [];
    }),
  );
}

export function changedComments(
  checklist: Checklist,
  current: CommentMap,
  persisted: CommentMap,
): Array<{ sectionId: string; comments: string }> {
  return checklist.sections.flatMap((section) =>
    (current[section.id] ?? '') !== (persisted[section.id] ?? '')
      ? [{ sectionId: section.id, comments: current[section.id] ?? '' }]
      : [],
  );
}
