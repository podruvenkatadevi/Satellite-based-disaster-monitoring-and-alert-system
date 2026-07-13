import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from '../components/Icons.jsx'
import ThemePicker from '../components/ThemePicker.jsx'

const FEATURES = [
  { icon: 'satellite', text: 'AI-powered satellite image analysis' },
  { icon: 'alert', text: 'Automatic flood, fire & cyclone alerts' },
  { icon: 'activity', text: 'Real-time monitoring dashboard' },
]

export default function Login() {
  const { loginUser, loginAsGuest } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [menu, setMenu] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    setTimeout(() => {
      const res = loginUser(email, pw)
      if (res.ok) { nav('/') } else { setErr(res.error); setBusy(false) }
    }, 350)
  }
  const guest = () => { loginAsGuest(); nav('/') }

  return (
    <div className="auth">
      <div className="auth-topbar"><ThemePicker /></div>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo"><Icon name="satellite" size={22} strokeWidth={2} /></div>
          <h2>Satellite Disaster<br />Monitoring System</h2>
          <p>Detect and respond to natural disasters from satellite imagery — powered by AWS.</p>
          <ul className="auth-feat">
            {FEATURES.map((f) => (
              <li key={f.text}><span className="fi"><Icon name={f.icon} size={16} /></span>{f.text}</li>
            ))}
          </ul>
          <div className="auth-brand-foot">S3 · Lambda · DynamoDB · SNS · CloudWatch</div>
        </div>

        <div className="auth-form">
          {/* three-dots menu with Admin login */}
          <div className="auth-more" ref={menuRef}>
            <button className="auth-more-btn" onClick={() => setMenu((m) => !m)} title="More options" aria-label="More options">
              <Icon name="dots" size={18} />
            </button>
            {menu && (
              <div className="auth-more-menu">
                <button onClick={() => nav('/admin-login')}><Icon name="lock" size={15} /> Admin login</button>
              </div>
            )}
          </div>

          <h1>Sign in</h1>
          <p className="sub">Access the monitoring dashboard.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>

            {err && <div className="auth-err"><Icon name="alert" size={15} /> {err}</div>}

            <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
              {busy ? <><span className="spinner" /> Signing in…</> : <>Sign in <Icon name="upload" size={16} style={{ transform: 'rotate(90deg)' }} /></>}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>
          <button className="btn ghost" onClick={guest} style={{ width: '100%' }}>Continue as guest</button>

          <div className="auth-link">
            New here? <button type="button" onClick={() => nav('/signup')}>Create an account</button>
          </div>
          <div className="auth-note">
            <Icon name="shieldCheck" size={14} /> Demo user login is shown in the server window (terminal).
          </div>
        </div>
      </div>
    </div>
  )
}
