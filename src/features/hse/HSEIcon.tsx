import type { HSEPageId } from './navigation';

export function HSEIcon({ name }: { name: HSEPageId }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'dashboard' && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {name === 'chains' && (
        <>
          <path d="m10 13 4-4" />
          <path d="M8.5 16H7a4 4 0 0 1 0-8h3" />
          <path d="M15.5 8H17a4 4 0 0 1 0 8h-3" />
        </>
      )}
      {name === 'scrapped' && (
        <>
          <path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" />
          <path d="M10 11v5M14 11v5" />
        </>
      )}
      {name === 'inspections' && (
        <>
          <rect x="5" y="4" width="12" height="16" rx="2" />
          <path d="M9 8h4M9 12h3" />
          <circle cx="17" cy="16" r="3" />
          <path d="m19.2 18.2 2 2" />
        </>
      )}
      {name === 'approvals' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </>
      )}
      {name === 'checklist' && (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="m8 9 1 1 2-2M13 9h4M8 16h9M8 13h9" />
        </>
      )}
      {name === 'reports' && (
        <>
          <path d="M4 20V10M10 20V5M16 20v-8M22 20V3" />
          <path d="M2 20h20" />
        </>
      )}
    </svg>
  );
}
