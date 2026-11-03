import { useState } from 'react';
import { env } from '../../config/env';
import { useAuth } from '../auth/AuthProvider';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { TeamDialogs, type TeamDialog } from './TeamDialogs';
import { CallButton } from './CallButton';
import { useTeamDirectory } from './queries';
import type { Staff, Team, TeamDirectory } from './types';

function PersonCard({
  staff,
  role,
  directory,
  admin,
  onAction,
}: {
  staff: Staff;
  role?: string;
  directory: TeamDirectory;
  admin: boolean;
  onAction(dialog: TeamDialog): void;
}) {
  const phone = directory.contacts.find((contact) => contact.staff_id === staff.id)?.phone;
  const protectedStaff = directory.teams.some(
    (team) => team.engineer_id === staff.id || team.leader_id === staff.id,
  );
  return (
    <article className="teams-person">
      <div className="teams-person-info">
        <strong>{staff.full_name}</strong>
        {role && <span className="teams-role">{role}</span>}
      </div>
      {(phone || admin) && (
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
          {admin && !protectedStaff && staff.role !== 'engineer' && (
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
          {admin && !protectedStaff && (
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
    </article>
  );
}

function TeamBranch({
  team,
  directory,
  admin,
  onAction,
  index,
}: {
  team: Team;
  directory: TeamDirectory;
  admin: boolean;
  onAction(dialog: TeamDialog): void;
  index: number;
}) {
  const leader = directory.staff.find((staff) => staff.id === team.leader_id);
  const members = directory.members
    .filter(
      (membership) => membership.team_id === team.id && membership.staff_id !== team.leader_id,
    )
    .map((membership) => directory.staff.find((staff) => staff.id === membership.staff_id))
    .filter((staff): staff is Staff => Boolean(staff));
  return (
    <section className={`teams-branch teams-branch-${index % 2}`} aria-label={`فريق ${team.name}`}>
      <div className="teams-branch-head">
        <div className="teams-branch-symbol" aria-hidden="true">
          {index % 2 === 0 ? '⚙' : 'ϟ'}
        </div>
        <div>
          <span className="teams-overline">فريق الصيانة</span>
          <h2>{team.name}</h2>
        </div>
        <span className="teams-count">{members.length} فنيين</span>
        {admin && (
          <button
            className="teams-edit-team"
            type="button"
            onClick={() => onAction({ kind: 'team', team })}
          >
            إدارة الفريق
          </button>
        )}
      </div>
      <div className="teams-branch-body">
        <div className="teams-section-label">مشرف</div>
        {leader ? (
          <PersonCard
            staff={leader}
            // role="قائد الفريق"
            directory={directory}
            admin={admin}
            onAction={onAction}
          />
        ) : (
          <p className="teams-placeholder">لم يُعيَّن قائد لهذا الفريق.</p>
        )}
        <div className="teams-members-heading">
          <span className="teams-section-label">الفنيون</span>
          <span>{members.length}</span>
        </div>
        <div className="teams-members">
          {members.length ? (
            members.map((staff) => (
              <PersonCard
                key={staff.id}
                staff={staff}
                role="فني صيانة"
                directory={directory}
                admin={admin}
                onAction={onAction}
              />
            ))
          ) : (
            <p className="teams-placeholder">لا يوجد فنيون في هذا الفريق بعد.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function TeamsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const directoryQuery = useTeamDirectory();
  const [dialog, setDialog] = useState<TeamDialog | null>(null);
  const directory = directoryQuery.data;
  const engineerIds = new Set(directory?.teams.map((team) => team.engineer_id) ?? []);
  const engineers = directory?.staff.filter((staff) => engineerIds.has(staff.id)) ?? [];
  const assigned = new Set([
    ...(directory?.members.map((member) => member.staff_id) ?? []),
    ...(directory?.teams.flatMap((team) => [team.engineer_id, team.leader_id]) ?? []),
  ]);
  const unassigned = directory?.staff.filter((staff) => !assigned.has(staff.id)) ?? [];
  const canManage = isAdmin && !env.isDemo;

  return (
    <div className="teams-page">
      <div className="teams-page-header">
        <div>
          <span className="teams-eyebrow">الهيكل التنظيمي · قسم الصيانة</span>
          <h1>فريق الصيانة</h1>
          <p>الأشخاص الذين يحافظون على جاهزية المصنع، في عرض واضح لكل فريق ومسؤولياته.</p>
        </div>
        {canManage && (
          <button
            type="button"
            className="primary-button"
            onClick={() => setDialog({ kind: 'staff' })}
          >
            <span>＋</span> إضافة موظف
          </button>
        )}
      </div>
      {directoryQuery.isPending || authLoading ? (
        <div className="teams-loading" role="status">
          <div className="teams-skeleton teams-skeleton-top" />
          <div className="teams-skeleton-grid">
            <div className="teams-skeleton" />
            <div className="teams-skeleton" />
          </div>
          <p>جارٍ تحميل الهيكل التنظيمي...</p>
        </div>
      ) : directoryQuery.isError ? (
        <div className="teams-state">
          <ErrorMessage error={directoryQuery.error} retry={() => void directoryQuery.refetch()} />
        </div>
      ) : directory && directory.teams.length ? (
        <>
          <div className="teams-chart">
            <div className="teams-engineers">
              <span className="teams-overline">مهندس الصيانة</span>
              {engineers.map((staff) => (
                <PersonCard
                  key={staff.id}
                  staff={staff}
                  directory={directory}
                  admin={canManage}
                  onAction={setDialog}
                />
              ))}
              {!engineers.length && <p className="teams-placeholder">لم يُعيَّن مهندس صيانة.</p>}
            </div>
            <div className="teams-branches">
              {directory.teams.map((team, index) => (
                <TeamBranch
                  key={team.id}
                  team={team}
                  directory={directory}
                  admin={canManage}
                  onAction={setDialog}
                  index={index}
                />
              ))}
            </div>
          </div>
          {canManage && (
            <section className="teams-unassigned">
              <div>
                <span className="teams-overline">إدارة الأفراد</span>
                <h2>
                  موظفون دون فريق <span>{unassigned.length}</span>
                </h2>
              </div>
              {unassigned.length ? (
                <div className="teams-unassigned-grid">
                  {unassigned.map((staff) => (
                    <PersonCard
                      key={staff.id}
                      staff={staff}
                      role={staff.role === 'engineer' ? 'مهندس · دون فريق' : 'فني · دون فريق'}
                      directory={directory}
                      admin
                      onAction={setDialog}
                    />
                  ))}
                </div>
              ) : (
                <p>كل الموظفين موزعون على الهيكل الحالي.</p>
              )}
            </section>
          )}
          {directory.contactsRestricted && canManage && (
            <p className="teams-hint">
              أرقام الهاتف غير متاحة حاليًا. بقية بيانات الفريق قابلة للعرض والإدارة.
            </p>
          )}
        </>
      ) : (
        <div className="teams-state">
          <div className="teams-state-icon">⌁</div>
          <h2>لا توجد فرق صيانة بعد</h2>
          <p>
            {env.isDemo
              ? 'يتطلب عرض الفريق الاتصال بقاعدة بيانات Supabase.'
              : 'لم تُسجّل فرق في قاعدة البيانات.'}
          </p>
        </div>
      )}
      {dialog && directory && (
        <TeamDialogs
          key={`${dialog.kind}-${'staff' in dialog ? dialog.staff?.id : 'team' in dialog ? dialog.team.id : 'new'}`}
          dialog={dialog}
          directory={directory}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
