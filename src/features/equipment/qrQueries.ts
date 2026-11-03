import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repository } from '../../services';
import { useAuth } from '../auth/AuthProvider';

export const qrKeys = {
  all: ['qr'] as const,
  details: (token: string) => ['qr', 'details', token] as const,
  token: (equipmentId: string) => ['qr', 'token', equipmentId] as const,
};

export const isQrToken = (token: string): boolean => /^[0-9a-f]{64}$/.test(token);

export function useQrEquipment(token: string) {
  return useQuery({
    queryKey: qrKeys.details(token),
    queryFn: () => repository.getEquipmentByQr(token),
    enabled: isQrToken(token),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useEquipmentQrToken(equipmentId: string) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: qrKeys.token(equipmentId),
    queryFn: () => repository.getEquipmentQrToken(equipmentId),
    enabled: isAdmin && Boolean(equipmentId),
    gcTime: 0,
  });
}

export function useRotateEquipmentQrToken(equipmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => repository.rotateEquipmentQrToken(equipmentId),
    onSuccess: (token) => {
      queryClient.setQueryData(qrKeys.token(equipmentId), token);
      queryClient.removeQueries({ queryKey: ['qr', 'details'] });
    },
  });
}
