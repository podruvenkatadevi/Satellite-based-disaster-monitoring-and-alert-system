import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from './Icons.jsx'

function initialsOf(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'U'
}

export default function ProfileMenu() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!user) return null
  const initials = initialsOf(user.name)

  return (
    <div className="profile" ref={ref}>
      <button className="profile-btn" onClick={() => setOpen((o) => !o)}>
        <span className="avatar">{initials}</span>
        <span className="pname">{user.name}</span>
        <Icon name="chevronDown" size={15} />
      </button>
      {open && (
        <div className="profile-menu">
          <div className="pm-head">
            <span className="avatar lg">{initials}</span>
            <div style={{ minWidth: 0 }}>
              <div className="pm-name">{user.name}</div>
              <div className="pm-email">{user.email}</div>
            </div>
          </div>
          <div className="pm-role">
            <span className={'role-badge ' + user.role}>{user.role === 'admin' ? 'Administrator' : 'User'}</span>
          </div>
          <button className="pm-item" onClick={() => { setOpen(false); logout(); nav('/login') }}>
            <Icon name="upload" size={16} style={{ transform: 'rotate(90deg)' }} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
