import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import StatCard from '../components/StatCard.jsx'
import { TypePill, SeverityPill } from '../components/Badges.jsx'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { useAuth, ACCOUNTS } from '../context/AuthContext.jsx'
import { SEVERITY_COLORS } from '../themes.js'

function Row({ label, value }) {
  return (
    <tr>
      <td style={{ color: 'var(--text-dim)', width: 150 }}>{label}</td>
      <td className="mono">{String(value)}</td>
    </tr>
  )
}

export default function Admin() {
  const { user, accounts } = useAuth()
  // Built-in accounts + accounts created via sign-up.
  const allAccounts = [
    ...Object.entries(ACCOUNTS).map(([email, a]) => ({ email, name: a.name, role: a.role, builtin: true })),
    ...accounts.map((a) => ({ email: a.email, name: a.name, role: a.role, builtin: false })),
  ]
  const [health, setHealth] = useState(null)
  const [stats, setStats] = useState(null)
  const [records, setRecords] = useState([])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const nav = useNavigate()

  const load = () => {
    api.health().then(setHealth).catch(() => {})
    api.stats().then(setStats).catch(() => {})
    api.disasters().then((d) => setRecords(d.items)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const doSeed = async () => {
    setBusy('seed'); setMsg('')
    try { const r = await api.seed(); setMsg(r.message); load() } finally { setBusy('') }
  }
  const doClear = async () => {
    if (!confirm('Remove ALL disaster records? This cannot be undone.')) return
    setBusy('clear'); setMsg('')
    try { const r = await api.clear(); setMsg(r.message); load() } finally { setBusy('') }
  }

  const setLifecycle = async (id, lifecycle) => {
    setBusy(id)
    try {
      await api.updateDisaster(id, lifecycle)
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy('')
    }
  }

  const removeRecord = async (id) => {
    if (!confirm('Delete this disaster record permanently?')) return
    setBusy('del-' + id)
    try {
      await api.deleteDisaster(id)
      setMsg('Record deleted.')
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy('')
    }
  }

  const total = stats?.total ?? 0
  const alerts = stats?.by_severity?.High ?? 0

  return (
    <div className="fade-in">
      <Topbar title="Admin Console" subtitle={`System management · signed in as ${user.name}`} />

      {/* Overview */}
      <div className="grid stats">
        <StatCard icon="layers" label="Total Records" value={total} foot={<span className="faint">in the database</span>} />
        <StatCard icon="alert" label="Active Alerts" value={alerts} accent={SEVERITY_COLORS.High} foot={<span className="faint">high severity</span>} />
        <StatCard icon="activity" label="Run Mode" value={health?.mock_mode ? 'MOCK' : 'LIVE'} foot={<span className="faint">{health?.mock_mode ? 'local, no AWS' : 'AWS connected'}</span>} />
        <StatCard icon="shieldCheck" label="Accounts" value={allAccounts.length} foot={<span className="faint">users + admin</span>} />
      </div>

      <div className="grid two mt">
        {/* System status */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">System Status</span>
            <button className="btn ghost sm" onClick={load}><Icon name="refresh" size={15} /> Refresh</button>
          </div>
          {health ? (
            <table className="kv">
              <tbody>
                <Row label="Service" value={health.service} />
                <Row label="Status" value={health.status} />
                <Row label="Mode" value={health.mock_mode ? 'MOCK (local)' : 'LIVE (AWS)'} />
                <Row label="AI backend" value={health.ai_backend || 'not run yet'} />
                {health.ai_error && <Row label="AI note" value={health.ai_error} />}
                <Row label="Region" value={health.region} />
                <Row label="S3 Bucket" value={health.s3_bucket} />
                <Row label="DynamoDB" value={health.ddb_table} />
                <Row label="SNS alerts" value={health.sns_configured ? 'configured' : 'not configured'} />
              </tbody>
            </table>
          ) : <div className="empty"><div className="t2">Loading…</div></div>}
        </div>

        {/* Data management */}
        <div className="card">
          <div className="card-head"><span className="card-title">Data Management</span></div>
          <p className="dim" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.55 }}>
            Populate the dashboard with sample detections, or wipe all records to start fresh.
            These actions are available to administrators only.
          </p>
          <div className="row">
            <button className="btn" onClick={doSeed} disabled={!!busy}>
              {busy === 'seed' ? <><span className="spinner" /> Seeding…</> : <><Icon name="layers" size={16} /> Load Sample Data</>}
            </button>
            <button className="btn ghost" onClick={doClear} disabled={!!busy}>
              {busy === 'clear' ? <><span className="spinner" /> Clearing…</> : <><Icon name="close" size={16} /> Clear All Data</>}
            </button>
          </div>
          {msg && (
            <div className="notice mt" style={{ borderColor: 'var(--border-strong)', color: 'var(--text)' }}>
              <Icon name="check" size={16} style={{ color: 'var(--accent)' }} /> {msg}
            </div>
          )}
        </div>
      </div>

      {/* Disaster records CRUD */}
      <div className="card mt">
        <div className="card-head">
          <span className="card-title">Disaster Records</span>
          <button className="btn ghost sm" onClick={load}><Icon name="refresh" size={15} /> Refresh</button>
        </div>
        {records.length === 0 ? (
          <div className="empty"><div className="t2">No records. Load sample data or upload an image.</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Location</th><th>Severity</th><th>Lifecycle</th><th>Time</th><th></th></tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td><TypePill type={r.type} /></td>
                    <td>{r.location}</td>
                    <td><SeverityPill severity={r.severity} /></td>
                    <td>
                      <select
                        className="lifecycle-select"
                        value={r.lifecycle || 'Active'}
                        disabled={busy === r.id}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setLifecycle(r.id, e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="faint">{new Date(r.timestamp).toLocaleString()}</td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn ghost sm" onClick={() => nav(`/reports/${r.id}`)}>View</button>
                        <button type="button" className="btn ghost sm" disabled={busy === 'del-' + r.id} onClick={() => removeRecord(r.id)}>
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accounts */}
      <div className="card mt">
        <div className="card-head"><span className="card-title">Registered Accounts</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Source</th></tr>
            </thead>
            <tbody>
              {allAccounts.map((a) => (
                <tr key={a.email}>
                  <td>{a.name}{a.email === user.email && <span className="faint"> (you)</span>}</td>
                  <td className="mono">{a.email}</td>
                  <td><span className={'role-badge ' + a.role}>{a.role === 'admin' ? 'Administrator' : 'User'}</span></td>
                  <td className="faint">{a.builtin ? 'Built-in' : 'Signed up'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
