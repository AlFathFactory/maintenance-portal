import { useState } from 'react';
import { env } from '../../config/env';
import { useAuth } from '../auth/AuthProvider';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { TeamDialogs, type TeamDialog } from './TeamDialogs';
import { StaffRow } from './StaffRow';
import { TeamTabs } from './TeamTabs';
import { useTeamDirectory } from './queries';
import type { Staff, Team, TeamDirectory } from './types';

interface TeamView {
  team: Team;
  leader: Staff | undefined;
  members: Staff[];
}

function teamViews(directory: TeamDirectory): TeamView[] {
  const staff = new Map(directory.staff.map((person) => [person.id, person]));
  return directory.teams.map((team) => ({
    team,
    leader: staff.get(team.leader_id),
    members: directory.members
      .filter(
        (membership) => membership.team_id === team.id && membership.staff_id !== team.leader_id,
      )
      .map((membership) => staff.get(membership.staff_id))
      .filter((person): person is Staff => Boolean(person)),
  }));
}

function TeamBranch({
  view,
  directory,
  admin,
  onAction,
  index,
}: {
  view: TeamView;
  directory: TeamDirectory;
  admin: boolean;
  onAction(dialog: TeamDialog): void;
  index: number;
}) {
  const { team, leader, members } = view;
  return (
    <section className={`teams-branch teams-branch-${index % 2}`} aria-label={`فريق ${team.name}`}>
      <div className="teams-branch-head">
        {/* <div className="teams-branch-symbol" aria-hidden="true">
          {index % 2 === 0 ? '⚙' : 'ϟ'}
        </div> */}
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
          <StaffRow
            staff={leader}
            kind="leader"
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
              <StaffRow
                key={staff.id}
                staff={staff}
                kind="technician"
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
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const directory = directoryQuery.data;
  const views = directory ? teamViews(directory) : [];
  const selectedView = views.find((view) => view.team.id === selectedTeamId) ?? views[0];
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
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  kind="engineer"
                  directory={directory}
                  admin={canManage}
                  onAction={setDialog}
                />
              ))}
              {!engineers.length && <p className="teams-placeholder">لم يُعيَّن مهندس صيانة.</p>}
            </div>
            <div className="teams-branches">
              {views.map((view, index) => (
                <TeamBranch
                  key={view.team.id}
                  view={view}
                  directory={directory}
                  admin={canManage}
                  onAction={setDialog}
                  index={index}
                />
              ))}
            </div>
          </div>
          <div className="teams-mobile-directory">
            <div className="teams-mobile-hero">
              <span className="teams-overline">مهندس الصيانة</span>
              {engineers.map((staff) => (
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  kind="engineer"
                  // role="الإشراف على الفرق"
                  directory={directory}
                  admin={canManage}
                  mobile
                  onAction={setDialog}
                />
              ))}
              {!engineers.length && <p className="teams-placeholder">لم يُعيَّن مهندس صيانة.</p>}
            </div>
            <TeamTabs
              teams={views.map((view) => ({
                id: view.team.id,
                name: view.team.name,
                count: view.members.length,
              }))}
              selectedId={selectedView.team.id}
              onSelect={setSelectedTeamId}
            />
            <section
              key={selectedView.team.id}
              className="teams-mobile-panel"
              role="tabpanel"
              id="teams-mobile-panel"
              aria-labelledby={`team-tab-${selectedView.team.id}`}
            >
              <div className="teams-mobile-panel-head">
                <div>
                  <span>فريق الصيانة</span>
                  <h2>{selectedView.team.name}</h2>
                </div>
                {canManage && (
                  <button
                    type="button"
                    className="teams-mobile-team-edit"
                    onClick={() => setDialog({ kind: 'team', team: selectedView.team })}
                  >
                    إدارة الفريق
                  </button>
                )}
              </div>
              <div className="teams-mobile-list">
                <p className="teams-mobile-section-label">مشرف الفريق</p>
                {selectedView.leader ? (
                  <StaffRow
                    staff={selectedView.leader}
                    kind="leader"
                    role="مشرف الفريق"
                    directory={directory}
                    admin={canManage}
                    mobile
                    onAction={setDialog}
                  />
                ) : (
                  <p className="teams-placeholder">لم يُعيَّن مشرف لهذا الفريق.</p>
                )}
                <p className="teams-mobile-section-label">
                  الفنيون <span>{selectedView.members.length}</span>
                </p>
                {selectedView.members.length ? (
                  selectedView.members.map((staff) => (
                    <StaffRow
                      key={staff.id}
                      staff={staff}
                      kind="technician"
                      role="فني صيانة"
                      directory={directory}
                      admin={canManage}
                      mobile
                      onAction={setDialog}
                    />
                  ))
                ) : (
                  <p className="teams-placeholder">لا يوجد فنيون في هذا الفريق بعد.</p>
                )}
              </div>
            </section>
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
                    <StaffRow
                      key={staff.id}
                      staff={staff}
                      kind={staff.role === 'engineer' ? 'engineer' : 'technician'}
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
