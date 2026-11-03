import { useState, type FormEvent } from 'react';
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
    if (!fullName) return setError('اسم الموظف مطلوب.');
    if (phone && !/^[+\d][\d\s()-]{6,19}$/.test(phone))
      return setError('أدخل رقم هاتف صالحًا من 7 إلى 20 حرفًا.');
    const input: StaffInput = {
      full_name: fullName,
      role: dialog.staff?.role ?? (form.get('role') === 'engineer' ? 'engineer' : 'technician'),
      phone: directory.contactsRestricted ? undefined : phone || null,
    };
    try {
      if (dialog.staff) await actions.updateStaff.mutateAsync({ id: dialog.staff.id, input });
      else await actions.createStaff.mutateAsync(input);
      toast.show('تم حفظ بيانات الموظف');
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
      toast.show('تم تحديث الفريق');
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
      return setError('أدخل اسم الفريق واختر المهندس والقائد.');
    try {
      await actions.updateTeam.mutateAsync({ id: dialog.team.id, name, engineerId, leaderId });
      toast.show('تم تحديث بيانات الفريق');
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
      toast.show('تم حذف الموظف');
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }

  if (dialog.kind === 'staff') {
    return (
      <Modal title={dialog.staff ? 'تعديل بيانات الموظف' : 'إضافة موظف'} onClose={onClose}>
        <form onSubmit={saveStaff}>
          <ErrorMessage error={error} />
          <label>
            الاسم الكامل
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
              الوظيفة
              <select name="role">
                <option value="technician">فني صيانة</option>
                <option value="engineer">مهندس صيانة</option>
              </select>
            </label>
          )}
          <label>
            رقم الهاتف
            <input
              name="phone"
              type="tel"
              dir="ltr"
              maxLength={20}
              defaultValue={dialog.staff ? phoneFor(directory, dialog.staff.id) : ''}
              placeholder="اختياري"
              disabled={directory.contactsRestricted}
            />
          </label>
          {directory.contactsRestricted && (
            <p className="teams-hint">بيانات الهاتف غير متاحة لهذا الحساب.</p>
          )}
          <div className="form-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              إلغاء
            </button>
            <button className="primary-button" disabled={pending}>
              حفظ
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
        title={`توزيع ${dialog.staff.full_name}`}
        subtitle="اختر الفريق أو اترك الموظف دون فريق."
        onClose={onClose}
      >
        <form onSubmit={saveAssignment}>
          <ErrorMessage error={error} />
          <label>
            الفريق
            <select name="team_id" defaultValue={current}>
              <option value="">دون فريق</option>
              {directory.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              إلغاء
            </button>
            <button className="primary-button" disabled={pending}>
              تأكيد
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
        title={`إدارة فريق ${dialog.team.name}`}
        subtitle="يمكن اختيار قائد من أعضاء الفريق أو من الموظفين غير الموزعين."
        onClose={onClose}
      >
        <form onSubmit={saveTeam}>
          <ErrorMessage error={error} />
          <label>
            اسم الفريق
            <input name="name" required maxLength={80} defaultValue={dialog.team.name} />
          </label>
          <label>
            مهندس الصيانة
            <select name="engineer_id" defaultValue={dialog.team.engineer_id}>
              {engineers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            قائد الفريق
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
              إلغاء
            </button>
            <button className="primary-button" disabled={pending}>
              حفظ التغييرات
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal title="تأكيد حذف الموظف" onClose={onClose}>
      <div className="teams-confirm">
        <ErrorMessage error={error} />
        <p>
          سيتم حذف <strong>{dialog.staff.full_name}</strong> وبيانات الاتصال والعضوية الخاصة به. هل
          تريد المتابعة؟
        </p>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="teams-danger" onClick={removeStaff} disabled={pending}>
            حذف الموظف
          </button>
        </div>
      </div>
    </Modal>
  );
}

export type TeamDialog = Dialog;
