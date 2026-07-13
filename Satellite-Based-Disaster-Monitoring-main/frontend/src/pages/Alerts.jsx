import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { TYPE_COLORS, TYPE_ICONS, SEVERITY_COLORS } from '../themes.js'

export default function Alerts() {
  const [items, setItems] = useState([])
  const load = () => api.alerts().then((d) => setItems(d.items)).catch(() => {})
  useEffect(() => { load() }, [])

  return (
    <div className="fade-in">
      <Topbar title="Alerts" subtitle="High-severity detections that triggered SNS notifications" />

      {items.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="ico"><Icon name="shieldCheck" size={22} /></div>
            <div className="t1">No active alerts</div>
            <div className="t2">High-severity detections (confidence &gt; 90%) will appear here.</div>
          </div>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {items.map((r) => {
            const c = TYPE_COLORS[r.type]
            return (
              <div key={r.id} className="card alert-card">
                <span className="accent-bar" style={{ background: SEVERITY_COLORS.High }} />
                <div className="a-head">
                  <span className="a-ico" style={{ background: c + '22', color: c }}>
                    <Icon name={TYPE_ICONS[r.type]} size={19} strokeWidth={2} />
                  </span>
                  <span className="pill" style={{ color: SEVERITY_COLORS.High, background: SEVERITY_COLORS.High + '1f', border: `1px solid ${SEVERITY_COLORS.High}33` }}>
                    <span className="dot" style={{ background: SEVERITY_COLORS.High }} /> High
                  </span>
                </div>
                <div className="a-type" style={{ color: c }}>{r.type}</div>
                <div className="a-meta"><Icon name="mapPin" size={13} /> {r.location}</div>

                <div style={{ marginTop: 14, fontSize: 12.5 }} className="dim">Confidence · <b style={{ color: 'var(--text)' }}>{r.confidence}%</b></div>
                <div className="confbar"><div style={{ width: `${r.confidence}%`, background: SEVERITY_COLORS.High }} /></div>

                <div className="a-meta" style={{ marginTop: 12, fontSize: 12 }}>
                  <Icon name="clock" size={13} /> {new Date(r.timestamp).toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="row mt">
        <button className="btn ghost sm" onClick={load}><Icon name="refresh" size={15} /> Refresh</button>
      </div>
    </div>
  )
}
