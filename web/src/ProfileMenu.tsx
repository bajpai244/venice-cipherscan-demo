import { useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Book,
  ChevronRight,
  CircleHelp,
  Coins,
  History,
  Lock,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react'
import Avatar from './Avatar'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (label: string) => void
  anchorRef: React.RefObject<HTMLElement | null>
}

type Item = {
  label: string
  icon: LucideIcon
  trailing?: LucideIcon
  accent?: boolean
  mirrored?: boolean
}

const SECTIONS: Item[][] = [
  [
    { label: 'Purchase Venice Credits', icon: Coins, accent: true },
    { label: 'Upgrade Venice plan', icon: Sparkles },
  ],
  [
    { label: 'Backup & Restore Chat History', icon: History, trailing: Lock },
    { label: 'Settings', icon: Settings },
  ],
  [
    { label: 'Help & feedback', icon: CircleHelp, trailing: ChevronRight },
    { label: 'Learn more', icon: Book, trailing: ChevronRight },
  ],
  [{ label: 'Sign out', icon: LogOut, mirrored: true }],
]

export default function ProfileMenu({ open, onClose, onSelect, anchorRef }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  return (
    <div
      ref={menuRef}
      className={`profile-menu ${open ? 'open' : ''}`}
      role="menu"
      aria-hidden={!open}
    >
      <div className="profile-menu-header">
        <Avatar className="avatar menu-avatar" />
        <div>
          <div className="profile-name">HARSH BAJPAI</div>
          <div className="profile-credits">
            <Coins size={14} strokeWidth={1.8} /> 0 Credits
          </div>
        </div>
      </div>
      {SECTIONS.map((items, i) => (
        <div className="profile-menu-section" key={i}>
          {items.map(({ label, icon: Icon, trailing: Trailing, accent, mirrored }) => (
            <button
              key={label}
              className="profile-menu-item"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                onClose()
                onSelect(label)
              }}
            >
              <Icon
                size={16}
                strokeWidth={1.8}
                className={`${accent ? 'accent' : ''} ${mirrored ? 'mirrored' : ''}`}
              />
              <span>{label}</span>
              {Trailing && <Trailing size={15} strokeWidth={1.8} className="trailing" />}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
