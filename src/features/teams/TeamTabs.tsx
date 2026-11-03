import type { KeyboardEvent } from 'react';

export interface TeamTab {
  id: string;
  name: string;
  count: number;
}

export function TeamTabs({
  teams,
  selectedId,
  onSelect,
}: {
  teams: TeamTab[];
  selectedId: string;
  onSelect(id: string): void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowLeft' ? 1 : -1) + teams.length) % teams.length;
    onSelect(teams[next].id);
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }

  return (
    <div className="teams-tabs" role="tablist" aria-label="فرق الصيانة">
      {teams.map((team, index) => (
        <button
          key={team.id}
          type="button"
          role="tab"
          id={`team-tab-${team.id}`}
          aria-controls="teams-mobile-panel"
          aria-selected={team.id === selectedId}
          tabIndex={team.id === selectedId ? 0 : -1}
          className={team.id === selectedId ? 'active' : ''}
          onClick={() => onSelect(team.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          <span>{team.name}</span>
          <span className="teams-tab-count">{team.count}</span>
        </button>
      ))}
    </div>
  );
}
