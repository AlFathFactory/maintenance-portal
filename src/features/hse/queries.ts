import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChainListFilter,
  InspectionListFilter,
  ChainCreateInput,
  ChainUpdateInput,
  ScrapChainInput,
  ChecklistSectionCreateInput,
  ChecklistSectionUpdateInput,
  ChecklistItemCreateInput,
  ChecklistItemUpdateInput,
  InspectionCreateInput,
  InspectionDraftUpdateInput,
  SaveInspectionResultInput,
  SaveInspectionCommentInput,
} from '../../domain/hse';
import { useAuth } from '../auth/AuthProvider';
import { hseRepository } from '../../services/hse';
import { canLoadHSE, hseKeys } from './queryKeys';

export { hseKeys } from './queryKeys';

function useHSEEnabled(): boolean {
  const { user, hseRole, loading } = useAuth();
  return canLoadHSE(user?.id ?? null, hseRole, loading);
}

export function useHSEChains(filter: ChainListFilter, active = true) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.chainList(filter),
    queryFn: () => hseRepository.listChains(filter),
    enabled: enabled && active,
  });
}

export function useHSEChainCount(filter: Partial<ChainListFilter>) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.chainCount(filter),
    queryFn: () => hseRepository.countChains(filter),
    enabled,
  });
}

export function useHSEChainReplacements(ids: string[]) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.chainReplacements(ids),
    queryFn: () => hseRepository.listChainReplacements(ids),
    enabled: enabled && ids.length > 0,
  });
}

export function useHSEChain(id: string) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.chain(id),
    queryFn: () => hseRepository.getChain(id),
    enabled: enabled && Boolean(id),
  });
}

export function useHSEChainLineage(id: string) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.lineage(id),
    queryFn: () => hseRepository.getChainLineage(id),
    enabled: enabled && Boolean(id),
  });
}

export function useHSEChainActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: hseKeys.chains });
  return {
    create: useMutation({
      mutationFn: (input: ChainCreateInput) => hseRepository.createChain(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ChainUpdateInput }) =>
        hseRepository.updateChain(id, input),
      onSuccess: refresh,
    }),
    scrap: useMutation({
      mutationFn: (input: ScrapChainInput) => hseRepository.scrapChain(input),
      onSuccess: refresh,
    }),
  };
}

export function useHSEChecklistVersions() {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.checklistVersions,
    queryFn: hseRepository.listChecklistVersions,
    enabled,
  });
}

export function useHSEChecklist(version: number) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.checklistVersion(version),
    queryFn: () => hseRepository.getChecklist(version),
    enabled: enabled && version > 0,
  });
}

export function useHSECurrentChecklist(state: 'draft' | 'published') {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.currentChecklist(state),
    queryFn: () => hseRepository.getCurrentChecklist(state),
    enabled,
  });
}

export function useHSEChecklistActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: hseKeys.checklist });
  return {
    createSection: useMutation({
      mutationFn: (input: ChecklistSectionCreateInput) =>
        hseRepository.createChecklistSection(input),
      onSuccess: refresh,
    }),
    updateSection: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ChecklistSectionUpdateInput }) =>
        hseRepository.updateChecklistSection(id, input),
      onSuccess: refresh,
    }),
    deleteSection: useMutation({
      mutationFn: (id: string) => hseRepository.deleteChecklistSection(id),
      onSuccess: refresh,
    }),
    createItem: useMutation({
      mutationFn: (input: ChecklistItemCreateInput) => hseRepository.createChecklistItem(input),
      onSuccess: refresh,
    }),
    updateItem: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ChecklistItemUpdateInput }) =>
        hseRepository.updateChecklistItem(id, input),
      onSuccess: refresh,
    }),
    deleteItem: useMutation({
      mutationFn: (id: string) => hseRepository.deleteChecklistItem(id),
      onSuccess: refresh,
    }),
  };
}

export function useHSEInspections(filter: InspectionListFilter = {}) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.inspectionList(filter),
    queryFn: () => hseRepository.listInspections(filter),
    enabled,
  });
}

export function useHSEInspectionCount(filter: InspectionListFilter = {}) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.inspectionCount(filter),
    queryFn: () => hseRepository.countInspections(filter),
    enabled,
  });
}

export function useHSEInspection(id: string) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.inspection(id),
    queryFn: () => hseRepository.getInspection(id),
    enabled: enabled && Boolean(id),
  });
}

export function useHSESignatures(id: string) {
  const enabled = useHSEEnabled();
  return useQuery({
    queryKey: hseKeys.signatures(id),
    queryFn: () => hseRepository.listSignatures(id),
    enabled: enabled && Boolean(id),
  });
}

export function useHSEInspectionActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: hseKeys.inspections });
  return {
    create: useMutation({
      mutationFn: (input: InspectionCreateInput) => hseRepository.createInspection(input),
      onSuccess: refresh,
    }),
    updateDraft: useMutation({
      mutationFn: ({ id, input }: { id: string; input: InspectionDraftUpdateInput }) =>
        hseRepository.updateInspectionDraft(id, input),
      onSuccess: refresh,
    }),
    saveResult: useMutation({
      mutationFn: (input: SaveInspectionResultInput) => hseRepository.saveInspectionResult(input),
      onSuccess: refresh,
    }),
    saveComment: useMutation({
      mutationFn: (input: SaveInspectionCommentInput) => hseRepository.saveInspectionComment(input),
      onSuccess: refresh,
    }),
    signAsInspector: useMutation({
      mutationFn: (id: string) => hseRepository.signAsInspector(id),
      onSuccess: refresh,
    }),
    submit: useMutation({
      mutationFn: (id: string) => hseRepository.submitInspection(id),
      onSuccess: refresh,
    }),
    signAsEngineer: useMutation({
      mutationFn: (id: string) => hseRepository.signAsEngineer(id),
      onSuccess: refresh,
    }),
    approve: useMutation({
      mutationFn: (id: string) => hseRepository.approveInspection(id),
      onSuccess: refresh,
    }),
  };
}
