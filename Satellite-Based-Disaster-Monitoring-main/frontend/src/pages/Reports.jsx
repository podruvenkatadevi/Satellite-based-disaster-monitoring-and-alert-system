import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import { TypePill, SeverityPill } from '../components/Badges.jsx'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'

export default function Reports() {
  const nav = useNavigate()
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [type, setType] = useState('All')
  const [sev, setSev] = useState('All')

  const load = () => api.disasters().then((d) => setItems(d.items)).catch(() => {})
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter((r) =>
    (type === 'All' || r.type === type) &&
    (sev === 'All' || r.severity === sev) &&
    (q === '' || (r.location || '').toLowerCase().includes(q.toLowerCase()))
  ), [items, q, type, sev])

  const exportCsv = () => {
    const esc = (v) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const head = 'id,type,confidence,severity,location,lifecycle,latitude,longitude,status,timestamp\n'
    const rows = filtered.map((r) =>
      [r.id, r.type, r.confidence, r.severity, r.location, r.lifecycle || 'Active', r.latitude, r.longitude, r.status, r.timestamp].map(esc).join(',')
    ).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([head + rows], { type: 'text/csv' }))
    a.download = 'disaster_reports.csv'; a.click()
  }

  return (
    <div className="fade-in">
      <Topbar title="Reports" subtitle={`${filtered.length} record${filtered.length === 1 ? '' : 's'}`} />

      <div className="card">
        <div className="row" style={{ marginBottom: 18 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }}>
              <Icon name="search" size={16} />
            </span>
            <input placeholder="Search by location" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 'auto' }}>
            <option value="All">All types</option>
            {['Flood', 'Fire', 'Cyclone', 'Normal'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={sev} onChange={(e) => setSev(e.target.value)} style={{ width: 'auto' }}>
            <option value="All">All severity</option>
            {['High', 'Medium', 'Low'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn ghost icon" onClick={load} title="Refresh"><Icon name="refresh" size={16} /></button>
          <button className="btn ghost sm" onClick={exportCsv}><Icon name="download" size={15} /> CSV</button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="ico"><Icon name="file" size={22} /></div>
            <div className="t1">No matching records</div>
            <div className="t2">Try adjusting the filters or search.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Confidence</th><th>Severity</th><th>Location</th><th>Status</th><th>Time</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="click-row" onClick={() => nav(`/reports/${r.id}`)}>
                    <td><TypePill type={r.type} /></td>
                    <td className="num">{r.confidence}%</td>
                    <td><SeverityPill severity={r.severity} /></td>
                    <td>{r.location}</td>
                    <td><span className={'lifecycle-badge ' + (r.lifecycle || 'Active').toLowerCase()}>{r.lifecycle || 'Active'}</span></td>
                    <td className="faint">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="faint" style={{ fontSize: 12 }}>View →</td>
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
