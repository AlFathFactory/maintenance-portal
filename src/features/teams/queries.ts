import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repository } from '../../services';
import type { StaffInput } from './types';

export const teamKeys = {
  all: ['teams'] as const,
  directory: (includeContacts: boolean) => ['teams', 'directory', includeContacts] as const,
};

export function useTeamDirectory(includeContacts: boolean) {
  return useQuery({
    queryKey: teamKeys.directory(includeContacts),
    queryFn: () => repository.listTeamDirectory(includeContacts),
  });
}

export function useTeamActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: teamKeys.all });
  return {
    createStaff: useMutation({
      mutationFn: (input: StaffInput) => repository.createStaff(input),
      onSuccess: refresh,
    }),
    updateStaff: useMutation({
      mutationFn: ({ id, input }: { id: string; input: StaffInput }) =>
        repository.updateStaff(id, input),
      onSuccess: refresh,
    }),
    deleteStaff: useMutation({
      mutationFn: (id: string) => repository.deleteStaff(id),
      onSuccess: refresh,
    }),
    assignStaff: useMutation({
      mutationFn: ({ staffId, teamId }: { staffId: string; teamId: string | null }) =>
        repository.assignStaff(staffId, teamId),
      onSuccess: refresh,
    }),
    updateTeam: useMutation({
      mutationFn: ({
        id,
        name,
        engineerId,
        leaderId,
      }: {
        id: string;
        name: string;
        engineerId: string;
        leaderId: string;
      }) => repository.updateTeam(id, name, engineerId, leaderId),
      onSuccess: refresh,
    }),
  };
}
