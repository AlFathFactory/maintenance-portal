import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repository } from '../../services';
import type { MaintenanceInput } from '../../domain/maintenance';

export function useMaintenance(equipmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['maintenance', equipmentId],
    queryFn: () => repository.listMaintenance(equipmentId),
    enabled: enabled && Boolean(equipmentId),
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MaintenanceInput) => repository.createMaintenance(input),
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['maintenance', input.equipment_id] }),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      ]);
    },
  });
}
