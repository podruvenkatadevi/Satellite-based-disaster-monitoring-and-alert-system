import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import { TypePill, SeverityPill } from '../components/Badges.jsx'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { TYPE_COLORS, TYPE_ICONS } from '../themes.js'

export default function Detail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [record, setRecord] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.disaster(id)
      .then(setRecord)
      .catch((e) => setErr(e.message))
  }, [id])

  if (err) {
    return (
      <div className="fade-in">
        <Topbar title="Disaster Details" subtitle="Record not found" />
        <div className="card empty">
          <div className="t1">{err}</div>
          <button className="btn mt" onClick={() => nav('/reports')}>Back to Reports</button>
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="fade-in">
        <Topbar title="Disaster Details" subtitle="Loading…" />
        <div className="card empty"><div className="t2">Loading record…</div></div>
      </div>
    )
  }

  const imgSrc = record.imageUrl?.startsWith('/uploads/') ? record.imageUrl : null
  const lifecycle = record.lifecycle || 'Active'
  const fmtCoord = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(4) : '—')

  return (
    <div className="fade-in">
      <Topbar
        title="Disaster Details"
        subtitle={`${record.type} · ${record.location}`}
      />

      <div className="row mb" style={{ marginBottom: 14 }}>
        <Link to="/reports" className="btn ghost sm"><Icon name="chevronLeft" size={16} /> Reports</Link>
        <Link to="/map" className="btn ghost sm"><Icon name="mapPin" size={16} /> Map</Link>
      </div>

      <div className="grid two">
        <div className="card">
          <div className="card-head"><span className="card-title">Satellite / Input Image</span></div>
          {imgSrc ? (
            <img src={imgSrc} alt={record.type} className="detail-img" />
          ) : (
            <div className="empty">
              <div className="ico"><Icon name="image" size={22} /></div>
              <div className="t2">Sample or remote image (no local preview)</div>
              <div className="faint mono" style={{ fontSize: 11, marginTop: 8 }}>{record.imageUrl}</div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Analysis</span></div>
          <div className="result-head" style={{ marginBottom: 16 }}>
            <span className="badge-ico" style={{ background: TYPE_COLORS[record.type] + '22', color: TYPE_COLORS[record.type] }}>
              <Icon name={TYPE_ICONS[record.type]} size={26} strokeWidth={2} />
            </span>
            <div>
              <div className="type">{record.type}</div>
              <div className="conf">Confidence · {record.confidence}%</div>
            </div>
          </div>
          <table className="kv">
            <tbody>
              <tr><td>Severity</td><td><SeverityPill severity={record.severity} /></td></tr>
              <tr><td>Location</td><td>{record.location}</td></tr>
              <tr><td>Coordinates</td><td className="mono faint">{fmtCoord(record.latitude)}, {fmtCoord(record.longitude)}</td></tr>
              <tr><td>Lifecycle</td><td><span className={'lifecycle-badge ' + lifecycle.toLowerCase()}>{lifecycle}</span></td></tr>
              <tr><td>Detection</td><td className="faint mono">{record.status}</td></tr>
              <tr><td>Detected</td><td className="faint">{new Date(record.timestamp).toLocaleString()}</td></tr>
              <tr><td>Record ID</td><td className="mono faint" style={{ fontSize: 11 }}>{record.id}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
