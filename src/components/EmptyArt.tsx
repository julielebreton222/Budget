// Small decorative illustrations for empty states.
export function PurseArt() {
  return (
    <svg className="empty-art" viewBox="0 0 140 140" aria-hidden="true">
      <circle cx="70" cy="74" r="58" fill="var(--accent-soft)" />
      <path d="M52 58c0-20 36-20 36 0" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" />
      <path d="M34 62h72q6 0 5 6l-7 36q-2 8-10 8H46q-8 0-10-8l-7-36q-1-6 5-6z" fill="var(--card)" stroke="var(--accent)" strokeWidth="4" />
      <path d="M31 70h78" stroke="var(--lilac)" strokeWidth="6" />
      <circle cx="70" cy="72" r="6" fill="var(--accent)" />
      <path d="M112 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="var(--lilac)" />
      <path d="M26 34l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--accent)" />
    </svg>
  )
}

export function JarArt() {
  return (
    <svg className="empty-art" viewBox="0 0 140 140" aria-hidden="true">
      <circle cx="70" cy="74" r="58" fill="var(--lilac-soft)" />
      <rect x="50" y="24" width="40" height="10" rx="4" fill="var(--accent)" />
      <path d="M54 34v10c-12 5-18 14-18 26v32q0 12 12 12h44q12 0 12-12V70c0-12-6-21-18-26V34" fill="var(--card)" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M44 66v4" stroke="var(--line)" strokeWidth="5" strokeLinecap="round" />
      <path d="M112 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="var(--accent)" />
      <path d="M24 92l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--lilac)" />
    </svg>
  )
}
