import type {
  Chain,
  ChainCreateInput,
  ChainLineage,
  ChainListFilter,
  ChainUpdateInput,
  ScrapChainInput,
  Checklist,
  ChecklistVersion,
  ChecklistSection,
  ChecklistItem,
  ChecklistSectionCreateInput,
  ChecklistSectionUpdateInput,
  ChecklistItemCreateInput,
  ChecklistItemUpdateInput,
  ChainInspection,
  InspectionDetails,
  InspectionListFilter,
  InspectionListItem,
  InspectionCreateInput,
  InspectionDraftUpdateInput,
  CheckpointResult,
  SectionComment,
  SaveInspectionResultInput,
  SaveInspectionCommentInput,
  InspectionSignature,
} from '../domain/hse';

export interface HSERepository {
  listChains(filter: ChainListFilter): Promise<Chain[]>;
  countChains(filter: Partial<ChainListFilter>): Promise<number>;
  listChainReplacements(predecessorIds: string[]): Promise<Chain[]>;
  getChain(id: string): Promise<Chain | null>;
  createChain(input: ChainCreateInput): Promise<Chain>;
  updateChain(id: string, input: ChainUpdateInput): Promise<Chain>;
  scrapChain(input: ScrapChainInput): Promise<string | null>;
  getChainLineage(id: string): Promise<ChainLineage>;

  listChecklistVersions(): Promise<ChecklistVersion[]>;
  getChecklist(version: number): Promise<Checklist | null>;
  getCurrentChecklist(state: 'draft' | 'published'): Promise<Checklist | null>;
  createChecklistSection(input: ChecklistSectionCreateInput): Promise<ChecklistSection>;
  updateChecklistSection(id: string, input: ChecklistSectionUpdateInput): Promise<ChecklistSection>;
  deleteChecklistSection(id: string): Promise<void>;
  createChecklistItem(input: ChecklistItemCreateInput): Promise<ChecklistItem>;
  updateChecklistItem(id: string, input: ChecklistItemUpdateInput): Promise<ChecklistItem>;
  deleteChecklistItem(id: string): Promise<void>;

  listInspections(filter?: InspectionListFilter): Promise<InspectionListItem[]>;
  getInspection(id: string): Promise<InspectionDetails | null>;
  createInspection(input: InspectionCreateInput): Promise<ChainInspection>;
  updateInspectionDraft(id: string, input: InspectionDraftUpdateInput): Promise<ChainInspection>;
  saveInspectionResult(input: SaveInspectionResultInput): Promise<CheckpointResult>;
  saveInspectionComment(input: SaveInspectionCommentInput): Promise<SectionComment>;
  submitInspection(id: string): Promise<ChainInspection>;
  listSignatures(inspectionId: string): Promise<InspectionSignature[]>;
  signAsInspector(inspectionId: string): Promise<InspectionSignature>;
  signAsEngineer(inspectionId: string): Promise<InspectionSignature>;
  approveInspection(id: string): Promise<ChainInspection>;
}

export const hseCapabilities = {
  publishChecklist: false,
  reorderChecklist: false,
} as const;
