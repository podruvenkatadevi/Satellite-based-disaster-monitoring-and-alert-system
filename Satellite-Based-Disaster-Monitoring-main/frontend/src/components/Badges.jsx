import { SEVERITY_COLORS, TYPE_COLORS, TYPE_ICONS } from '../themes.js'
import Icon from './Icons.jsx'

// Convert a hex accent + low-opacity tint into an inline style for a soft pill.
function soft(hex) {
  return { color: hex, background: hex + '1f', border: `1px solid ${hex}33` }
}

export function SeverityPill({ severity }) {
  const c = SEVERITY_COLORS[severity] || '#888'
  return (
    <span className="pill" style={soft(c)}>
      <span className="dot" style={{ background: c }} />
      {severity}
    </span>
  )
}

export function TypePill({ type }) {
  const c = TYPE_COLORS[type] || '#888'
  return (
    <span className="pill" style={soft(c)}>
      <Icon name={TYPE_ICONS[type]} size={13} strokeWidth={2} />
      {type}
    </span>
  )
}
