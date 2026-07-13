import ThemePicker from './ThemePicker.jsx'
import ProfileMenu from './ProfileMenu.jsx'
import { useStatus } from '../context/StatusContext.jsx'

export default function Topbar({ title, subtitle }) {
  const { mock } = useStatus()
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="muted">{subtitle}</div>}
      </div>
      <div className="topbar-actions">
        {mock !== undefined && (
          <span className={'status-chip ' + (mock ? 'mock' : 'live')}>
            <span className="led" />
            {mock ? 'Mock Mode' : 'Live · AWS'}
          </span>
        )}
        <ThemePicker />
        <ProfileMenu />
      </div>
    </div>
  )
}
