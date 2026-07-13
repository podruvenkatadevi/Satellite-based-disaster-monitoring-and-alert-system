import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import Icon from '../components/Icons.jsx'
import { SeverityPill } from '../components/Badges.jsx'
import { api } from '../api.js'
import { useStatus } from '../context/StatusContext.jsx'
import { TYPE_COLORS, TYPE_ICONS, SEVERITY_COLORS } from '../themes.js'
import { LOCATIONS } from '../locations.js'

export default function Upload() {
  const { mock } = useStatus()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [location, setLocation] = useState('Andhra Pradesh')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()
  const previewRef = useRef(null)

  const pick = (f) => {
    if (!f) return
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = URL.createObjectURL(f)
    setFile(f)
    setResult(null)
    setPreview(previewRef.current)
  }

  const clearAll = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setFile(null)
    setPreview(null)
    setResult(null)
  }

  const submit = async () => {
    if (!file) return
    setBusy(true); setResult(null)
    try { setResult((await api.upload(file, location)).result) }
    catch (e) { alert('Upload failed: ' + e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="fade-in">
      <Topbar title="Analyze Image" subtitle="Upload a satellite image for disaster classification" />

      <div className="grid two">
        <div className="card">
          <div className="card-head"><span className="card-title">Input</span></div>
          <div
            className={'dropzone' + (drag ? ' drag' : '')}
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
          >
            {preview ? (
              <img src={preview} alt="preview" className="preview-img" />
            ) : (
              <>
                <div className="ico-wrap"><Icon name="image" size={24} /></div>
                <div className="t1">Click to browse or drag an image here</div>
                <div className="t2">PNG or JPG, satellite imagery</div>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />
          </div>

          <div className="field mt">
            <label>Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>

          <div className="row">
            <button className="btn" onClick={submit} disabled={!file || busy}>
              {busy ? <><span className="spinner" /> Analyzing…</> : <><Icon name="activity" size={16} /> Run Analysis</>}
            </button>
            {file && <button className="btn ghost" onClick={clearAll}>Clear</button>}
          </div>
          <p className="faint mt" style={{ fontSize: 12 }}>
            Tip: name a file <code>flood_1.jpg</code> to force that class for a demo.
          </p>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Result</span></div>
          {!result ? (
            <div className="empty">
              <div className="ico"><Icon name="activity" size={22} /></div>
              <div className="t1">Awaiting analysis</div>
              <div className="t2">Run analysis to see the predicted class, confidence, and severity.</div>
            </div>
          ) : (
            <div className="fade-in">
              <div className="result-head">
                <span className="badge-ico" style={{ background: TYPE_COLORS[result.type] + '22', color: TYPE_COLORS[result.type] }}>
                  <Icon name={TYPE_ICONS[result.type]} size={26} strokeWidth={2} />
                </span>
                <div style={{ flex: 1 }}>
                  <div className="type">{result.type}</div>
                  <div className="conf">Confidence · {result.confidence}%</div>
                  <div className="confbar"><div style={{ width: `${result.confidence}%`, background: TYPE_COLORS[result.type] }} /></div>
                </div>
              </div>

              <table className="kv">
                <tbody>
                  <tr><td>Severity</td><td><SeverityPill severity={result.severity} /></td></tr>
                  <tr><td>Location</td><td>{result.location}</td></tr>
                  <tr><td>Lifecycle</td><td><span className="lifecycle-badge active">Active</span></td></tr>
                  <tr><td>Status</td><td>{result.status === 'ALERT_SENT' ? 'Alert dispatched (SNS)' : 'Analyzed'}</td></tr>
                  <tr><td>Storage</td><td className="mono faint" style={{ maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{result.imageUrl}</td></tr>
                  <tr><td>Time</td><td className="faint">{new Date(result.timestamp).toLocaleString()}</td></tr>
                </tbody>
              </table>

              {result.severity === 'High' && (
                <div className="notice" style={{ borderColor: SEVERITY_COLORS.High + '55', background: SEVERITY_COLORS.High + '14', color: 'var(--text)' }}>
                  <span style={{ color: SEVERITY_COLORS.High, flexShrink: 0 }}><Icon name="alert" size={18} /></span>
                  <span><b>High severity.</b> An alert was dispatched via SNS to the authorities
                  {mock && <span className="faint"> (printed to the backend console in mock mode).</span>}</span>
                </div>
              )}

              <div className="row mt">
                <Link to={`/reports/${result.id}`} className="btn ghost sm">View details</Link>
                {result.type !== 'Normal' && (
                  <Link to="/map" className="btn ghost sm"><Icon name="map" size={15} /> Open map</Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
