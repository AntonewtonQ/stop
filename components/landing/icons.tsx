export type CategoryType = "name" | "country" | "food" | "job";

export function StopwatchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="13" r="7" />
      <path d="M12 13l3-3M9 2h6M12 6V2M18 6l2 2" />
    </svg>
  );
}

export function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 15c3.8-.8 6.2.8 7 4" />
    </svg>
  );
}

export function CategoryIcon({ type }: { type: CategoryType }) {
  if (type === "country") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c2 2.2 3 4.8 3 8s-1 5.8-3 8M12 4c-2 2.2-3 4.8-3 8s1 5.8 3 8" />
      </svg>
    );
  }

  if (type === "food") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3v7M4 3v4c0 2 1 3 3 3s3-1 3-3V3M7 10v11M16 3c-2 3-2 7 1 9v9M17 12h3V3c-3 0-4 3-4 6" />
      </svg>
    );
  }

  if (type === "job") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V4h6v3M3 12c5 3 13 3 18 0M12 12v3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.5-5 3.2-7 8-7s7.5 2 8 7" />
    </svg>
  );
}
