export type HSEPageId =
  'dashboard' | 'chains' | 'scrapped' | 'inspections' | 'approvals' | 'checklist';

export interface HSEPageDefinition {
  id: HSEPageId;
  path: string;
  to: string;
  labelKey: string;
  descriptionKey: string;
  engineerOnly?: boolean;
}

export const hsePages: readonly HSEPageDefinition[] = [
  {
    id: 'dashboard',
    path: '',
    to: '/hse',
    labelKey: 'hse.dashboard',
    descriptionKey: 'hse.dashboardDescription',
  },
  {
    id: 'chains',
    path: 'chains',
    to: '/hse/chains',
    labelKey: 'hse.chains',
    descriptionKey: 'hse.chainsDescription',
  },
  {
    id: 'scrapped',
    path: 'scrapped',
    to: '/hse/scrapped',
    labelKey: 'hse.scrapped',
    descriptionKey: 'hse.scrappedDescription',
  },
  {
    id: 'inspections',
    path: 'inspections',
    to: '/hse/inspections',
    labelKey: 'hse.inspections',
    descriptionKey: 'hse.inspectionsDescription',
  },
  {
    id: 'approvals',
    path: 'approvals',
    to: '/hse/approvals',
    labelKey: 'hse.approvals',
    descriptionKey: 'hse.approvalsDescription',
    engineerOnly: true,
  },
  {
    id: 'checklist',
    path: 'checklist',
    to: '/hse/checklist',
    labelKey: 'hse.checklist',
    descriptionKey: 'hse.checklistDescription',
  },
];

export function getHSEPage(pathname: string): HSEPageDefinition | undefined {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/hse') return hsePages[0];
  return hsePages.slice(1).find((page) => path === page.to || path.startsWith(`${page.to}/`));
}
