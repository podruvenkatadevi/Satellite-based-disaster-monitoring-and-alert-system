import { NavLink } from 'react-router-dom'
import Icon from './Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const links = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/upload', label: 'Analyze Image', icon: 'upload' },
  { to: '/map', label: 'Disaster Map', icon: 'map' },
  { to: '/reports', label: 'Reports', icon: 'file' },
  { to: '/alerts', label: 'Alerts', icon: 'bell' },
]

export default function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo"><Icon name="satellite" size={19} strokeWidth={2} /></span>
        <div>
          <div className="name">Disaster Monitor</div>
          <div className="sub">Satellite Intelligence</div>
        </div>
      </div>

      <div className="nav-label">Overview</div>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Icon name={l.icon} size={18} />
          <span>{l.label}</span>
        </NavLink>
      ))}

      {user?.role === 'admin' && (
        <>
          <div className="nav-label">Administration</div>
          <NavLink to="/admin"
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <Icon name="shieldCheck" size={18} />
            <span>Admin Console</span>
          </NavLink>
        </>
      )}

      <div className="sidebar-foot">
        <div><span className="dot">●</span> Powered by AWS</div>
        <div className="faint">S3 · Lambda · DynamoDB · SNS</div>
      </div>
    </aside>
  )
}
