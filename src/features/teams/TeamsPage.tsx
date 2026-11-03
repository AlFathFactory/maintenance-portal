import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { team, leader, members } = view;
  return (
    <section
      className={`teams-branch teams-branch-${index % 2}`}
      aria-label={`${t('teams.team')} ${team.name}`}
    >
      <div className="teams-branch-head">
        {/* <div className="teams-branch-symbol" aria-hidden="true">
          {index % 2 === 0 ? '⚙' : 'ϟ'}
        </div> */}
        <div>
          <span className="teams-overline">{t('teams.team')}</span>
          <h2 dir="auto">{team.name}</h2>
        </div>
        <span className="teams-count">
          {t('teams.techniciansCount', { count: members.length })}
        </span>
        {admin && (
          <button
            className="teams-edit-team"
            type="button"
            onClick={() => onAction({ kind: 'team', team })}
          >
            {t('teams.manageTeam')}
          </button>
        )}
      </div>
      <div className="teams-branch-body">
        <div className="teams-section-label">{t('teams.supervisor')}</div>
        {leader ? (
          <StaffRow staff={leader} directory={directory} admin={admin} onAction={onAction} />
        ) : (
          <p className="teams-placeholder">{t('teams.leaderMissing')}</p>
        )}
        <div className="teams-members-heading">
          <span className="teams-section-label">{t('teams.technicians')}</span>
          <span>{members.length}</span>
        </div>
        <div className="teams-members">
          {members.length ? (
            members.map((staff) => (
              <StaffRow
                key={staff.id}
                staff={staff}
                role={t('teams.technician')}
                directory={directory}
                admin={admin}
                onAction={onAction}
              />
            ))
          ) : (
            <p className="teams-placeholder">{t('teams.techniciansMissing')}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function TeamsPage() {
  const { t } = useTranslation();
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
          <span className="teams-eyebrow">{t('teams.eyebrow')}</span>
          <h1>{t('teams.title')}</h1>
          <p>{t('teams.intro')}</p>
        </div>
        {canManage && (
          <button
            type="button"
            className="primary-button"
            onClick={() => setDialog({ kind: 'staff' })}
          >
            <span>＋</span> {t('teams.add')}
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
          <p>{t('teams.loading')}</p>
        </div>
      ) : directoryQuery.isError ? (
        <div className="teams-state">
          <ErrorMessage error={directoryQuery.error} retry={() => void directoryQuery.refetch()} />
        </div>
      ) : directory && directory.teams.length ? (
        <>
          <div className="teams-chart">
            <div className="teams-engineers">
              <span className="teams-overline">{t('teams.engineer')}</span>
              {engineers.map((staff) => (
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  directory={directory}
                  admin={canManage}
                  onAction={setDialog}
                />
              ))}
              {!engineers.length && (
                <p className="teams-placeholder">{t('teams.engineerMissing')}</p>
              )}
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
              <span className="teams-overline">{t('teams.engineer')}</span>
              {engineers.map((staff) => (
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  directory={directory}
                  admin={canManage}
                  mobile
                  onAction={setDialog}
                />
              ))}
              {!engineers.length && (
                <p className="teams-placeholder">{t('teams.engineerMissing')}</p>
              )}
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
                  <span>{t('teams.team')}</span>
                  <h2 dir="auto">{selectedView.team.name}</h2>
                </div>
                {canManage && (
                  <button
                    type="button"
                    className="teams-mobile-team-edit"
                    onClick={() => setDialog({ kind: 'team', team: selectedView.team })}
                  >
                    {t('teams.manageTeam')}
                  </button>
                )}
              </div>
              <div className="teams-mobile-list">
                <p className="teams-mobile-section-label">{t('teams.supervisorFull')}</p>
                {selectedView.leader ? (
                  <StaffRow
                    staff={selectedView.leader}
                    role={t('teams.supervisorFull')}
                    directory={directory}
                    admin={canManage}
                    mobile
                    onAction={setDialog}
                  />
                ) : (
                  <p className="teams-placeholder">{t('teams.mobileLeaderMissing')}</p>
                )}
                <p className="teams-mobile-section-label">
                  {t('teams.technicians')} <span>{selectedView.members.length}</span>
                </p>
                {selectedView.members.length ? (
                  selectedView.members.map((staff) => (
                    <StaffRow
                      key={staff.id}
                      staff={staff}
                      role={t('teams.technician')}
                      directory={directory}
                      admin={canManage}
                      mobile
                      onAction={setDialog}
                    />
                  ))
                ) : (
                  <p className="teams-placeholder">{t('teams.techniciansMissing')}</p>
                )}
              </div>
            </section>
          </div>
          {canManage && (
            <section className="teams-unassigned">
              <div>
                <span className="teams-overline">{t('teams.peopleAdmin')}</span>
                <h2>
                  {t('teams.unassigned')} <span>{unassigned.length}</span>
                </h2>
              </div>
              {unassigned.length ? (
                <div className="teams-unassigned-grid">
                  {unassigned.map((staff) => (
                    <StaffRow
                      key={staff.id}
                      staff={staff}
                      role={t(
                        staff.role === 'engineer'
                          ? 'teams.unassignedEngineer'
                          : 'teams.unassignedTechnician',
                      )}
                      directory={directory}
                      admin
                      onAction={setDialog}
                    />
                  ))}
                </div>
              ) : (
                <p>{t('teams.allAssigned')}</p>
              )}
            </section>
          )}
          {directory.contactsRestricted && canManage && (
            <p className="teams-hint">{t('teams.contactsRestricted')}</p>
          )}
        </>
      ) : (
        <div className="teams-state">
          <div className="teams-state-icon">⌁</div>
          <h2>{t('teams.empty')}</h2>
          <p>{env.isDemo ? t('teams.demoEmpty') : t('teams.databaseEmpty')}</p>
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
