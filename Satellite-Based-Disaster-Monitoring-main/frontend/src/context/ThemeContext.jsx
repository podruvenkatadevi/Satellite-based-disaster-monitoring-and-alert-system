import { createContext, useContext, useEffect, useState } from 'react'
import { THEMES, DEFAULT_THEME } from '../themes.js'

const ThemeContext = createContext(null)

// The app opens on the user's chosen default (or Beige Brown until they set one).
// Selecting a theme previews it live; it becomes the startup theme only when the
// user clicks "Set as default".
function savedDefault() {
  const def = localStorage.getItem('defaultTheme')
  return def && THEMES[def] ? def : DEFAULT_THEME
}

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(savedDefault)
  const [defaultKey, setDefaultKey] = useState(savedDefault)

  useEffect(() => {
    const theme = THEMES[themeKey] || THEMES[DEFAULT_THEME]
    const root = document.documentElement
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    root.style.colorScheme = theme.mode === 'light' ? 'light' : 'dark'
  }, [themeKey])

  const setAsDefault = () => {
    localStorage.setItem('defaultTheme', themeKey)
    setDefaultKey(themeKey)
  }

  return (
    <ThemeContext.Provider value={{ themeKey, setThemeKey, themes: THEMES, defaultKey, setAsDefault }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
