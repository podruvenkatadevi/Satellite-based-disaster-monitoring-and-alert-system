import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext.jsx'
import Icon from './Icons.jsx'

export default function ThemePicker() {
  const { themeKey, setThemeKey, themes, defaultKey, setAsDefault } = useTheme()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const entries = Object.entries(themes)
  const light = entries.filter(([, t]) => t.mode === 'light')
  const dark = entries.filter(([, t]) => t.mode === 'dark')

  const handleDefault = () => {
    setAsDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  const Group = ({ title, list }) => (
    <>
      <div className="head">{title}</div>
      {list.map(([key, t]) => (
        <button key={key} className={key === themeKey ? 'sel' : ''} onClick={() => setThemeKey(key)}>
          <span className="sw" style={{ background: t.swatch }} />
          <span className="tname">{t.label}</span>
          {key === defaultKey && <span className="def-badge">default</span>}
          {key === themeKey && <span className="tick"><Icon name="check" size={15} /></span>}
        </button>
      ))}
    </>
  )

  return (
    <div className="theme-picker" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} title="Change theme" aria-label="Change theme">
        <Icon name="palette" size={18} />
      </button>
      {open && (
        <div className="theme-menu">
          <div className="tm-scroll">
            <Group title="Light" list={light} />
            <Group title="Dark" list={dark} />
          </div>
          <button className="set-default" onClick={handleDefault}>
            {saved
              ? <><Icon name="check" size={15} /> Saved as default</>
              : <>Set “{themes[themeKey].label}” as default</>}
          </button>
        </div>
      )}
    </div>
  )
}
