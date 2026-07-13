import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import StatCard from '../components/StatCard.jsx'
import { TypePill, SeverityPill } from '../components/Badges.jsx'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { TYPE_COLORS, SEVERITY_COLORS } from '../themes.js'

export default function Dashboard() {
  const nav = useNavigate()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [busy, setBusy] = useState(false)

  const load = () => {
    api.stats().then(setStats).catch(() => {})
    api.disasters().then((d) => setRecent(d.items.slice(0, 6))).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const seed = async () => {
    setBusy(true)
    try { await api.seed(); load() } finally { setBusy(false) }
  }

  const total = stats?.total || 0
  const byType = stats?.by_type || {}
  const bySev = stats?.by_severity || {}
  const maxType = Math.max(1, ...Object.values(byType))

  return (
    <div className="fade-in">
      <Topbar title="Dashboard" subtitle="Real-time overview of satellite disaster detections" />

      <div className="grid stats">
        <StatCard icon="layers" label="Total Analyzed" value={total} foot={<><Icon name="activity" size={13} /> All detections</>} />
        <StatCard icon="alert" label="Active Alerts" value={bySev.High || 0} accent={SEVERITY_COLORS.High} foot={<span className="faint">High severity</span>} />
        <StatCard icon="droplet" label="Floods" value={byType.Flood || 0} accent={TYPE_COLORS.Flood} />
        <StatCard icon="flame" label="Fires" value={byType.Fire || 0} accent={TYPE_COLORS.Fire} />
      </div>

      <div className="grid two mt">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Detections by Type</span>
            <button className="btn ghost sm" onClick={load}><Icon name="refresh" size={15} /> Refresh</button>
          </div>
          {total === 0 ? (
            <div className="empty">
              <div className="ico"><Icon name="image" size={22} /></div>
              <div className="t1">No data yet</div>
              <div className="t2">Upload an image or load sample data to populate the dashboard.</div>
              <div className="mt">
                <button className="btn" onClick={seed} disabled={busy}>
                  {busy ? <><span className="spinner" /> Loading…</> : 'Load Sample Data'}
                </button>
              </div>
            </div>
          ) : (
            Object.keys(byType).map((t) => (
              <div className="bar-row" key={t}>
                <span className="lbl"><Icon name={{ Flood:'droplet', Fire:'flame', Cyclone:'wind', Normal:'shieldCheck' }[t]} size={14} /> {t}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(byType[t] / maxType) * 100}%`, background: TYPE_COLORS[t] }} />
                </span>
                <span className="num">{byType[t]}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Severity Breakdown</span>
            {total > 0 && <button className="btn ghost sm" onClick={seed} disabled={busy}>Add Samples</button>}
          </div>
          {['High', 'Medium', 'Low'].map((s) => (
            <div className="bar-row" key={s}>
              <span className="lbl" style={{ width: 84 }}><SeverityPill severity={s} /></span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${total ? ((bySev[s] || 0) / total) * 100 : 0}%`, background: SEVERITY_COLORS[s] }} />
              </span>
              <span className="num">{bySev[s] || 0}</span>
            </div>
          ))}
          <div className="foot mt faint" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            Severity is set from model confidence: &gt;90% High, &gt;70% Medium, otherwise Low.
          </div>
        </div>
      </div>

      <div className="card mt">
        <div className="card-head">
          <span className="card-title">Recent Detections<span className="sub">latest {recent.length}</span></span>
        </div>
        {recent.length === 0 ? (
          <div className="empty"><div className="t2">No detections recorded yet.</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Confidence</th><th>Severity</th><th>Location</th><th>Time</th></tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="click-row" onClick={() => nav(`/reports/${r.id}`)}>
                    <td><TypePill type={r.type} /></td>
                    <td className="num">{r.confidence}%</td>
                    <td><SeverityPill severity={r.severity} /></td>
                    <td>{r.location}</td>
                    <td className="faint">{new Date(r.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
