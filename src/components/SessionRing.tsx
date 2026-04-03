interface Props {
  answered: number
  total: number
  size?: number
}

export function SessionRing({ answered, total, size = 22 }: Props) {
  const r = (size - 4) / 2
  const circumference = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(answered / total, 1) : 0
  const offset = circumference * (1 - pct)

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90"
      aria-label={`${answered} von ${total} Aufgaben`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#1e293b"
        strokeWidth={2}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#2563EB"
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}
