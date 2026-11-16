export type ChainStatus = 'active' | 'scrapped';
export type ChainLegCount = 1 | 2 | 3 | 4;

export interface Chain {
  id: string;
  tag_no: string;
  number_of_legs: ChainLegCount;
  working_load_limit_tons: number;
  length_m: number;
  start_working_date: string;
  status: ChainStatus;
  scrapping_date: string | null;
  scrapping_reason: string | null;
  replaces_chain_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ChainCreateInput = Pick<
  Chain,
  'tag_no' | 'number_of_legs' | 'working_load_limit_tons' | 'length_m' | 'start_working_date'
> & { replaces_chain_id?: string | null };
export type ChainUpdateInput = Pick<
  Chain,
  'number_of_legs' | 'working_load_limit_tons' | 'length_m' | 'start_working_date'
>;
export interface ScrapChainInput {
  chainId: string;
  scrappingDate: string;
  reason?: string | null;
  replacement?: ChainUpdateInput;
}
export interface ChainLineage {
  ancestors: Chain[];
  chain: Chain;
  successors: Chain[];
}
export interface ChainListFilter {
  status: ChainStatus;
  tagNo?: string;
  sortBy?: 'tag_no' | 'created_at' | 'start_working_date';
  ascending?: boolean;
  offset?: number;
  limit?: number;
}

export type ChecklistVersionState = 'draft' | 'published' | 'archived';
export interface ChecklistVersion {
  version: number;
  state: ChecklistVersionState;
  created_at: string;
  published_at: string | null;
}
export interface ChecklistSection {
  id: string;
  template_version: number;
  section_key: string;
  sort_order: number;
  name_en: string;
  name_ar: string;
  created_at: string;
}
export interface ChecklistItem {
  id: string;
  section_id: string;
  template_version: number;
  sort_order: number;
  check_text_en: string;
  created_at: string;
}
export interface ChecklistSectionWithItems extends ChecklistSection {
  items: ChecklistItem[];
}
export interface Checklist {
  version: ChecklistVersion;
  sections: ChecklistSectionWithItems[];
}
export type ChecklistSectionCreateInput = Pick<
  ChecklistSection,
  'template_version' | 'section_key' | 'sort_order' | 'name_en' | 'name_ar'
>;
export type ChecklistSectionUpdateInput = Partial<
  Pick<ChecklistSection, 'section_key' | 'sort_order' | 'name_en' | 'name_ar'>
>;
export type ChecklistItemCreateInput = Pick<
  ChecklistItem,
  'template_version' | 'section_id' | 'sort_order' | 'check_text_en'
>;
export type ChecklistItemUpdateInput = Partial<Pick<ChecklistItem, 'sort_order' | 'check_text_en'>>;

export type InspectionStatus = 'draft' | 'pending_approval' | 'approved';
export type InspectionResultValue = 'OK' | 'Faulty' | 'N/A';
export interface ChainSnapshot {
  chain_tag_snapshot: string;
  chain_legs_snapshot: ChainLegCount;
  chain_wll_tons_snapshot: number;
  chain_length_m_snapshot: number;
  chain_start_working_date_snapshot: string;
}
export interface ChainInspection extends ChainSnapshot {
  id: string;
  chain_id: string;
  template_version: number;
  inspector_id: string;
  inspection_date: string;
  status: InspectionStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
}
export type InspectionListItem = Pick<
  ChainInspection,
  | 'id'
  | 'chain_id'
  | 'chain_tag_snapshot'
  | 'inspection_date'
  | 'inspector_id'
  | 'status'
  | 'submitted_at'
  | 'approved_by'
  | 'approved_at'
>;
export interface CheckpointResult {
  inspection_id: string;
  item_id: string;
  result: InspectionResultValue;
  created_at: string;
  updated_at: string;
}
export interface SectionComment {
  inspection_id: string;
  section_id: string;
  comments_corrective_actions: string;
  created_at: string;
  updated_at: string;
}
export type InspectionSignerRole = 'inspector' | 'hse_engineer';
export interface InspectionSignature {
  inspection_id: string;
  signer_role: InspectionSignerRole;
  signed_by: string;
  signed_at: string;
  signature_method: 'authenticated_account';
  attestation_text: string;
}
export interface InspectionDetails {
  inspection: ChainInspection;
  checklist: Checklist;
  results: CheckpointResult[];
  comments: SectionComment[];
  signatures: InspectionSignature[];
}
export interface InspectionListFilter {
  chainId?: string;
  status?: InspectionStatus;
  offset?: number;
  limit?: number;
}
export type InspectionCreateInput = Pick<
  ChainInspection,
  'chain_id' | 'template_version' | 'inspection_date'
>;
export type InspectionDraftUpdateInput = Pick<ChainInspection, 'inspection_date'>;
export interface SaveInspectionResultInput {
  inspectionId: string;
  itemId: string;
  result: InspectionResultValue;
}
export interface SaveInspectionCommentInput {
  inspectionId: string;
  sectionId: string;
  comments: string;
}
