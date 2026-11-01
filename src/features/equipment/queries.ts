import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repository } from '../../services';

export const equipmentKeys = {
  all: ['equipment'] as const,
  list: ['equipment', 'list'] as const,
  detail: (slug: string) => ['equipment', slug] as const,
};

export function useEquipmentList() {
  return useQuery({ queryKey: equipmentKeys.list, queryFn: () => repository.listEquipment() });
}

export function useEquipment(slug: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(slug),
    queryFn: () => repository.getEquipment(slug),
    enabled: Boolean(slug),
  });
}

export function useEquipmentActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: equipmentKeys.all });
  return {
    create: useMutation({ mutationFn: repository.createEquipment, onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string;
        input: Parameters<typeof repository.updateEquipment>[1];
      }) => repository.updateEquipment(id, input),
      onSuccess: refresh,
    }),
    setStatus: useMutation({
      mutationFn: ({
        id,
        status,
      }: {
        id: string;
        status: Parameters<typeof repository.updateStatus>[1];
      }) => repository.updateStatus(id, status),
      onSuccess: refresh,
    }),
  };
}
