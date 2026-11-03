import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { Modal } from '../../shared/ui/Modal';
import { useToast } from '../../shared/ui/ToastProvider';
import { useTeamActions } from './queries';
import type { Staff, StaffInput, Team, TeamDirectory } from './types';

type Dialog =
  | { kind: 'staff'; staff?: Staff }
  | { kind: 'assign'; staff: Staff }
  | { kind: 'team'; team: Team }
  | { kind: 'delete'; staff: Staff };

function phoneFor(directory: TeamDirectory, id: string): string {
  return directory.contacts.find((entry) => entry.staff_id === id)?.phone ?? '';
}

export function TeamDialogs({
  dialog,
  directory,
  onClose,
}: {
  dialog: Dialog;
  directory: TeamDirectory;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<unknown>(null);
  const actions = useTeamActions();
  const toast = useToast();
  const pending = Object.values(actions).some((action) => action.isPending);

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog.kind !== 'staff') return;
    setError(null);
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get('full_name') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    if (!fullName) return setError(t('teamForm.nameRequired'));
    if (phone && !/^[+\d][\d\s()-]{6,19}$/.test(phone)) return setError(t('teamForm.phoneInvalid'));
    const input: StaffInput = {
      full_name: fullName,
      role: dialog.staff?.role ?? (form.get('role') === 'engineer' ? 'engineer' : 'technician'),
      phone: directory.contactsRestricted ? undefined : phone || null,
    };
    try {
      if (dialog.staff) await actions.updateStaff.mutateAsync({ id: dialog.staff.id, input });
      else await actions.createStaff.mutateAsync(input);
      toast.show(t('teamForm.staffSaved'));
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog.kind !== 'assign') return;
    setError(null);
    const teamId = String(new FormData(event.currentTarget).get('team_id') ?? '');
    try {
      await actions.assignStaff.mutateAsync({ staffId: dialog.staff.id, teamId: teamId || null });
      toast.show(t('teamForm.teamUpdated'));
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog.kind !== 'team') return;
    setError(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const engineerId = String(form.get('engineer_id') ?? '');
    const leaderId = String(form.get('leader_id') ?? '');
    if (!name || !engineerId || !leaderId || engineerId === leaderId)
      return setError(t('teamForm.teamRequired'));
    try {
      await actions.updateTeam.mutateAsync({ id: dialog.team.id, name, engineerId, leaderId });
      toast.show(t('teamForm.teamSaved'));
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }

  async function removeStaff() {
    if (dialog.kind !== 'delete') return;
    setError(null);
    try {
      await actions.deleteStaff.mutateAsync(dialog.staff.id);
      toast.show(t('teamForm.deleted'));
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }

  if (dialog.kind === 'staff') {
    return (
      <Modal title={t(dialog.staff ? 'teamForm.editStaff' : 'teamForm.addStaff')} onClose={onClose}>
        <form onSubmit={saveStaff}>
          <ErrorMessage error={error} />
          <label>
            {t('teamForm.fullName')}
            <input
              name="full_name"
              required
              maxLength={120}
              defaultValue={dialog.staff?.full_name ?? ''}
              autoFocus
            />
          </label>
          {!dialog.staff && (
            <label>
              {t('teamForm.job')}
              <select name="role">
                <option value="technician">{t('roles.technician')}</option>
                <option value="engineer">{t('roles.engineer')}</option>
              </select>
            </label>
          )}
          <label>
            {t('teamForm.phone')}
            <input
              name="phone"
              type="tel"
              dir="ltr"
              maxLength={20}
              defaultValue={dialog.staff ? phoneFor(directory, dialog.staff.id) : ''}
              placeholder={t('common.optional')}
              disabled={directory.contactsRestricted}
            />
          </label>
          {directory.contactsRestricted && (
            <p className="teams-hint">{t('teamForm.phoneUnavailable')}</p>
          )}
          <div className="form-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button className="primary-button" disabled={pending}>
              {t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  if (dialog.kind === 'assign') {
    const current =
      directory.members.find((member) => member.staff_id === dialog.staff.id)?.team_id ?? '';
    return (
      <Modal
        title={t('teamForm.assignTitle', { name: dialog.staff.full_name })}
        subtitle={t('teamForm.assignHint')}
        onClose={onClose}
      >
        <form onSubmit={saveAssignment}>
          <ErrorMessage error={error} />
          <label>
            {t('teamForm.team')}
            <select name="team_id" defaultValue={current}>
              <option value="">{t('teamForm.withoutTeam')}</option>
              {directory.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button className="primary-button" disabled={pending}>
              {t('common.confirm')}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  if (dialog.kind === 'team') {
    const engineers = directory.staff.filter(
      (staff) =>
        staff.role === 'engineer' || directory.teams.some((team) => team.engineer_id === staff.id),
    );
    const leaders = directory.staff.filter(
      (staff) =>
        staff.role !== 'engineer' &&
        staff.id !== dialog.team.engineer_id &&
        !directory.teams.some(
          (team) =>
            team.id !== dialog.team.id &&
            (team.leader_id === staff.id || team.engineer_id === staff.id),
        ) &&
        !directory.members.some(
          (member) => member.staff_id === staff.id && member.team_id !== dialog.team.id,
        ),
    );
    return (
      <Modal
        title={t('teamForm.teamTitle', { name: dialog.team.name })}
        subtitle={t('teamForm.teamHint')}
        onClose={onClose}
      >
        <form onSubmit={saveTeam}>
          <ErrorMessage error={error} />
          <label>
            {t('teamForm.teamName')}
            <input name="name" required maxLength={80} defaultValue={dialog.team.name} />
          </label>
          <label>
            {t('teamForm.engineer')}
            <select name="engineer_id" defaultValue={dialog.team.engineer_id}>
              {engineers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('teamForm.leader')}
            <select name="leader_id" defaultValue={dialog.team.leader_id}>
              {leaders.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button className="primary-button" disabled={pending}>
              {t('common.saveChanges')}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal title={t('teamForm.confirmDelete')} onClose={onClose}>
      <div className="teams-confirm">
        <ErrorMessage error={error} />
        <p>{t('teamForm.deleteHint', { name: dialog.staff.full_name })}</p>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="teams-danger" onClick={removeStaff} disabled={pending}>
            {t('teams.deleteEmployee')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export type TeamDialog = Dialog;
