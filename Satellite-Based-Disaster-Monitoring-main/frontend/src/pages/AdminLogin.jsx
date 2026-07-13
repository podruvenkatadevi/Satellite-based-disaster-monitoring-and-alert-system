import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from '../components/Icons.jsx'
import ThemePicker from '../components/ThemePicker.jsx'

const CAPS = [
  { icon: 'activity', text: 'Live system status & health' },
  { icon: 'layers', text: 'Seed or clear all records' },
  { icon: 'shieldCheck', text: 'Manage registered accounts' },
]

export default function AdminLogin() {
  const { loginAdmin } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    setTimeout(() => {
      const res = loginAdmin(email, pw)
      if (res.ok) { nav('/admin') } else { setErr(res.error); setBusy(false) }
    }, 350)
  }

  return (
    <div className="auth admin-auth">
      <div className="auth-topbar"><ThemePicker /></div>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo"><Icon name="lock" size={22} strokeWidth={2} /></div>
          <span className="auth-tag">Restricted access</span>
          <h2>Administrator<br />Console</h2>
          <p>Sign in with an administrator account to manage the system.</p>
          <ul className="auth-feat">
            {CAPS.map((f) => (
              <li key={f.text}><span className="fi"><Icon name={f.icon} size={16} /></span>{f.text}</li>
            ))}
          </ul>
          <div className="auth-brand-foot">Authorized personnel only</div>
        </div>

        <div className="auth-form">
          <h1>Administrator sign-in</h1>
          <p className="sub">This login is separate from the user login.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label>Admin email</label>
              <input type="email" placeholder="admin@demo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Admin password</label>
              <input type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>

            {err && <div className="auth-err"><Icon name="alert" size={15} /> {err}</div>}

            <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
              {busy ? <><span className="spinner" /> Verifying…</> : <><Icon name="lock" size={16} /> Sign in as admin</>}
            </button>
          </form>

          <div className="auth-link">
            <button type="button" onClick={() => nav('/login')}><Icon name="arrowLeft" size={14} /> Back to user login</button>
          </div>
          <div className="auth-note">
            <Icon name="shieldCheck" size={14} /> Admin credentials are shown in the server window (terminal).
          </div>
        </div>
      </div>
    </div>
  )
}
