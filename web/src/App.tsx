import { useCallback, useRef, useState } from 'react'
import {
  Bot,
  ChevronDown,
  Coins,
  Ellipsis,
  ExternalLink,
  Gift,
  Globe,
  Image,
  Images,
  MessageSquare,
  MessageSquareText,
  Mic,
  PanelLeft,
  Paperclip,
  Search,
  Sparkles,
  Video,
  X,
} from 'lucide-react'
import WaterBackground from './WaterBackground'
import KeysLogo from './KeysLogo'
import Avatar from './Avatar'
import ProfileMenu from './ProfileMenu'
import UpgradeModal from './UpgradeModal'

const NAV = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'agentic', label: 'Agentic Chat', icon: Bot },
  { id: 'studio', label: 'Studio', icon: Images },
  { id: 'more', label: 'More', icon: Ellipsis },
]

const SUGGESTIONS = [
  { label: 'Learn about the World', icon: Globe },
  { label: 'Generate any image', icon: Image },
  { label: 'Create AI Video', icon: Video },
  { label: 'Surprise Me', icon: Sparkles },
]

export default function App() {
  const [active, setActive] = useState('agentic')
  const [collapsed, setCollapsed] = useState(false)
  const [showInvite, setShowInvite] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), [])
  const onMenuSelect = useCallback((label: string) => {
    if (label === 'Upgrade Venice plan') setUpgradeOpen(true)
  }, [])

  return (
    <div className="app">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && <span className="wordmark">Venice</span>}
          <button
            className="icon-btn"
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed((c) => !c)}
          >
            <PanelLeft size={16} strokeWidth={1.6} />
          </button>
        </div>

        <nav className="nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${active === id ? 'active' : ''}`}
              onClick={() => setActive(id)}
              title={label}
            >
              <Icon size={16} strokeWidth={1.6} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <>
            <div className="section-label">Folders</div>
            <div className="section-label">Chats</div>
          </>
        )}

        <div className="sidebar-footer">
          {!collapsed && (
            <ProfileMenu
              open={menuOpen}
              onClose={closeMenu}
              onSelect={onMenuSelect}
              anchorRef={menuButtonRef}
            />
          )}
          {showInvite && !collapsed && (
            <div className="invite">
              <span className="invite-icon">
                <Gift size={12} strokeWidth={1.8} />
              </span>
              <span className="invite-text">Invite &amp; Earn $10</span>
              <button
                className="icon-btn small"
                aria-label="Dismiss"
                onClick={() => setShowInvite(false)}
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="profile">
            <Avatar />
            {!collapsed && (
              <>
                <div className="profile-meta">
                  <div className="profile-name">HARSH BAJPAI</div>
                  <div className="profile-credits">
                    <Coins size={11} strokeWidth={1.8} /> 0 Credits
                  </div>
                </div>
                <button
                  ref={menuButtonRef}
                  className={`icon-btn ${menuOpen ? 'pressed' : ''}`}
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <Ellipsis size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      <main className="main">
        <WaterBackground />

        <a className="classic-link" href="#">
          <MessageSquareText size={13} strokeWidth={1.8} />
          Use Classic Chat
          <ExternalLink size={11} strokeWidth={1.8} />
        </a>

        <section className="hero">
          <KeysLogo className="keys" />
          <h1>What will you create?</h1>

          <form className="composer" onSubmit={(e) => e.preventDefault()}>
            <button type="button" className="icon-btn" aria-label="Attach">
              <Paperclip size={14} strokeWidth={1.7} />
            </button>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask me anything privately..."
            />
            <button type="button" className="agent-select">
              <Bot size={14} strokeWidth={1.7} />
              Agent
              <ChevronDown size={12} strokeWidth={1.8} />
            </button>
            <button type="submit" className="mic" aria-label="Voice input">
              <Mic size={14} strokeWidth={2} />
            </button>
          </form>

          <div className="suggestions">
            {SUGGESTIONS.map(({ label, icon: Icon }) => (
              <button key={label} className="chip" onClick={() => setPrompt(label)}>
                <Icon size={13} strokeWidth={1.7} />
                {label}
              </button>
            ))}
          </div>
        </section>

        <a className="footer-link" href="#">
          Looking for other models? Go to classic chat
          <ExternalLink size={11} strokeWidth={1.8} />
        </a>

        <button className="feedback-btn" aria-label="Feedback">
          <MessageSquareText size={14} strokeWidth={1.7} />
        </button>
      </main>

      <UpgradeModal open={upgradeOpen} onClose={closeUpgrade} />
    </div>
  )
}
