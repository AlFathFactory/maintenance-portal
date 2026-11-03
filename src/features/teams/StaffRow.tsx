import { useState } from 'react';
import { CallButton } from './CallButton';
import type { TeamDialog } from './TeamDialogs';
import type { Staff, TeamDirectory } from './types';

export function StaffRow({
  staff,
  role,
  directory,
  admin,
  mobile = false,
  onAction,
}: {
  staff: Staff;
  role?: string;
  directory: TeamDirectory;
  admin: boolean;
  mobile?: boolean;
  onAction(dialog: TeamDialog): void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const phone = directory.contacts.find((contact) => contact.staff_id === staff.id)?.phone;
  const protectedStaff = directory.teams.some(
    (team) => team.engineer_id === staff.id || team.leader_id === staff.id,
  );
  const canAssign = !protectedStaff && staff.role !== 'engineer';
  const canDelete = !protectedStaff;
  const openDialog = (dialog: TeamDialog) => {
    setMenuOpen(false);
    onAction(dialog);
  };

  return (
    <article className={`teams-person${mobile ? ' teams-person-mobile' : ''}`}>
      <div className="teams-person-info">
        <strong>{staff.full_name}</strong>
        {role && <span className="teams-role">{role}</span>}
      </div>
      {mobile ? (
        (phone || admin) && (
          <div className="teams-person-mobile-controls">
            {admin && (
              <button
                type="button"
                className="teams-menu-trigger"
                aria-label={`إجراءات ${staff.full_name}`}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                ⋯
              </button>
            )}
            <CallButton name={staff.full_name} phone={phone} />
          </div>
        )
      ) : (
        <div className="teams-person-actions">
          <CallButton name={staff.full_name} phone={phone} />
          {admin && (
            <button
              type="button"
              className="teams-icon-button"
              onClick={() => onAction({ kind: 'staff', staff })}
              aria-label={`تعديل ${staff.full_name}`}
              title="تعديل"
            >
              ✎
            </button>
          )}
          {admin && canAssign && (
            <button
              type="button"
              className="teams-icon-button"
              onClick={() => onAction({ kind: 'assign', staff })}
              aria-label={`توزيع ${staff.full_name}`}
              title="توزيع الفريق"
            >
              ↔
            </button>
          )}
          {admin && canDelete && (
            <button
              type="button"
              className="teams-icon-button teams-icon-danger"
              onClick={() => onAction({ kind: 'delete', staff })}
              aria-label={`حذف ${staff.full_name}`}
              title="حذف"
            >
              ×
            </button>
          )}
        </div>
      )}
      {mobile && menuOpen && admin && (
        <div className="teams-mobile-actions">
          <button type="button" onClick={() => openDialog({ kind: 'staff', staff })}>
            تعديل البيانات
          </button>
          {canAssign && (
            <button type="button" onClick={() => openDialog({ kind: 'assign', staff })}>
              نقل بين الفرق
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="teams-mobile-delete"
              onClick={() => openDialog({ kind: 'delete', staff })}
            >
              حذف الموظف
            </button>
          )}
        </div>
      )}
    </article>
  );
}
