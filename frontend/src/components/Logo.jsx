// Merk van het platform: schild met vinkje + woordmerk
export function LogoMark({ size = 24 }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.6 4.6 5.4v5.9c0 4.5 3.1 8.3 7.4 9.9 4.3-1.6 7.4-5.4 7.4-9.9V5.4L12 2.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m8.6 12.1 2.3 2.3 4.5-4.6" stroke="#6aa5ff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Logo() {
  return (
    <span className="brand-lockup">
      <LogoMark />
      <span className="brand-word">
        <b>SOC</b> Casemanagement
      </span>
    </span>
  )
}
