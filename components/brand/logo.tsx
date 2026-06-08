import styles from "./logo.module.css";

type LogoProps = {
  compact?: boolean;
  light?: boolean;
};

export function Logo({ compact = false, light = false }: LogoProps) {
  return (
    <div
      className={`${styles.logo} ${compact ? styles.compact : ""} ${
        light ? styles.light : ""
      }`}
      aria-label="stop.ao"
    >
      <svg
        className={styles.symbol}
        viewBox="0 0 88 88"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M45 10v9M36 10h18M67 20l7 7M64 24l6 6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="7"
        />
        <path
          d="M68 68A31 31 0 1 1 66 25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="7"
        />
        <rect className={styles.letterBox} x="24" y="28" width="38" height="38" rx="11" />
        <path
          d="M52 40c-2-3-6-4-9-4-5 0-8 2-8 6 0 4 3 5 8 6 6 1 9 3 9 7 0 5-4 7-9 7-5 0-9-2-11-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M66 39h13M68 49h11M66 59h13"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="5"
        />
      </svg>

      {!compact && (
        <div className={styles.wordmark}>
          stop<span>.</span>ao
        </div>
      )}
    </div>
  );
}
