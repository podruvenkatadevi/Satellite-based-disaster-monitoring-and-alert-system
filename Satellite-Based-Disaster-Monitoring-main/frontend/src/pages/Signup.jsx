import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from '../components/Icons.jsx'
import ThemePicker from '../components/ThemePicker.jsx'

const PERKS = [
  { icon: 'dashboard', text: 'Your own monitoring dashboard' },
  { icon: 'upload', text: 'Upload & analyze satellite images' },
  { icon: 'bell', text: 'Get disaster alerts instantly' },
]

export default function Signup() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    if (pw !== pw2) { setErr('Passwords do not match.'); return }
    setBusy(true)
    setTimeout(() => {
      const res = signup(name, email, pw)
      if (res.ok) { nav('/') } else { setErr(res.error); setBusy(false) }
    }, 350)
  }

  return (
    <div className="auth">
      <div className="auth-topbar"><ThemePicker /></div>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo"><Icon name="userPlus" size={22} strokeWidth={2} /></div>
          <h2>Create your<br />account</h2>
          <p>Join the Satellite Disaster Monitoring System and start tracking events in real time.</p>
          <ul className="auth-feat">
            {PERKS.map((f) => (
              <li key={f.text}><span className="fi"><Icon name={f.icon} size={16} /></span>{f.text}</li>
            ))}
          </ul>
          <div className="auth-brand-foot">Free demo account · no credit card</div>
        </div>

        <div className="auth-form">
          <h1>Sign up</h1>
          <p className="sub">Create a user account in a few seconds.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label>Full name</label>
              <input placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="At least 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" placeholder="Re-enter password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>

            {err && <div className="auth-err"><Icon name="alert" size={15} /> {err}</div>}

            <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
              {busy ? <><span className="spinner" /> Creating…</> : <><Icon name="userPlus" size={16} /> Create account</>}
            </button>
          </form>

          <div className="auth-link">
            Already have an account? <button type="button" onClick={() => nav('/login')}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  )
}
