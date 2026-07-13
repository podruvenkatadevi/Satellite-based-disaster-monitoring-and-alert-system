import Icon from './Icons.jsx'

export default function StatCard({ icon, value, label, foot, accent }) {
  return (
    <div className="card stat">
      <div className="row1">
        <span className="label">{label}</span>
        <span className="ico" style={accent ? { color: accent, background: 'transparent' } : undefined}>
          <Icon name={icon} size={17} />
        </span>
      </div>
      <div className="value">{value}</div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  )
}
