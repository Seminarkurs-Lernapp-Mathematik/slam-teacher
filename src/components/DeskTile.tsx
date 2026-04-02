import React from 'react'
import type { StudentSummary } from '../types'

const STATUS_CONFIG = {
  active: {
    label: 'Aktiv',
    dotClass: 'bg-green-500',
    textClass: 'text-green-500',
    borderClass: 'border-green-500',
    glowClass: 'shadow-[0_0_8px_rgba(34,197,94,0.4)]',
    pulse: false,
  },
  idle: {
    label: 'Idle',
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-400',
    glowClass: '',
    pulse: false,
  },
  struggling: {
    label: 'Kämpft',
    dotClass: 'bg-red-500',
    textClass: 'text-red-500',
    borderClass: 'border-red-500',
    glowClass: '',
    pulse: true,
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-slate-600',
    textClass: 'text-slate-500',
    borderClass: 'border-slate-700',
    glowClass: '',
    pulse: false,
  },
}

function formatTimeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  return `vor ${hours} Std.`
}

interface Props {
  student: StudentSummary
  onClick?: () => void
  beamerName?: string
  extraContent?: React.ReactNode
}

export function DeskTile({ student, onClick, beamerName, extraContent }: Props) {
  const cfg = STATUS_CONFIG[student.status]
  const name = beamerName ?? student.displayName

  return (
    <div
      data-testid="desk-tile"
      onClick={onClick}
      className={`w-[108px] h-[66px] rounded-[8px] border-2 ${cfg.borderClass} ${cfg.glowClass} ${
        student.status === 'offline' ? 'opacity-50' : ''
      } bg-[#101828] cursor-pointer flex flex-col justify-center items-center p-1 gap-0.5 select-none`}
    >
      <span className="text-white text-xs font-medium truncate max-w-full px-1 leading-tight">
        {name}
      </span>
      <div className="flex items-center gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass} ${cfg.pulse ? 'animate-pulse' : ''}`}
        />
        <span className={`text-[10px] ${cfg.textClass}`}>{cfg.label}</span>
      </div>
      <span className="text-[9px] text-slate-500 leading-tight">
        {student.lastActive ? formatTimeSince(student.lastActive) : '—'}
      </span>
      {extraContent}
    </div>
  )
}
