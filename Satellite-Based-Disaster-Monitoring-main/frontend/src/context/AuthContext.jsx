import { createContext, useContext, useState } from 'react'

// Mock authentication for the demo (no real backend auth — everything lives in
// localStorage). Three flows:
//   - user login  (registered accounts + the built-in demo user)
//   - admin login (the built-in administrator only — separate page)
//   - sign up     (new visitors create their own user account)
const AuthContext = createContext(null)

// Built-in accounts. The admin is fixed ("real admin") and cannot be created via sign-up.
export const ACCOUNTS = {
  'admin@demo.com': { password: 'Admin@123', name: 'Administrator', role: 'admin' },
  'user@demo.com': { password: 'User@123', name: 'Demo User', role: 'user' },
}

const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadJSON('user', null))
  const [accounts, setAccounts] = useState(() => loadJSON('accounts', [])) // registered users

  const persistUser = (u) => { localStorage.setItem('user', JSON.stringify(u)); setUser(u) }
  const persistAccounts = (list) => { localStorage.setItem('accounts', JSON.stringify(list)); setAccounts(list) }

  const findAccount = (key) => ACCOUNTS[key] || accounts.find((a) => a.email === key)

  // New visitor creates a user account, then is signed in.
  const signup = (name, email, password) => {
    const key = (email || '').trim().toLowerCase()
    if (!name.trim() || !key || !password) return { ok: false, error: 'Please fill in all fields.' }
    if (!emailOk(key)) return { ok: false, error: 'Please enter a valid email address.' }
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
    if (findAccount(key)) return { ok: false, error: 'An account with this email already exists.' }

    const acct = { email: key, password, name: name.trim(), role: 'user' }
    persistAccounts([...accounts, acct])
    persistUser({ email: acct.email, name: acct.name, role: 'user' })
    return { ok: true, role: 'user' }
  }

  // Normal user login (registered users + built-in demo user). Admins can't sign in here.
  const loginUser = (email, password) => {
    const key = (email || '').trim().toLowerCase()
    if (!key || !password) return { ok: false, error: 'Please enter your email and password.' }

    const builtin = ACCOUNTS[key]
    if (builtin?.role === 'admin') return { ok: false, error: 'This is an admin account — use the admin login.' }

    const acct = findAccount(key)
    if (!acct) return { ok: false, error: 'No account found. Create one with “Create account”.' }
    if (acct.password !== password) return { ok: false, error: 'Incorrect password.' }

    persistUser({ email: key, name: acct.name, role: 'user' })
    return { ok: true, role: 'user' }
  }

  // Administrator login (separate page). Admin account only.
  const loginAdmin = (email, password) => {
    const key = (email || '').trim().toLowerCase()
    if (!key || !password) return { ok: false, error: 'Please enter the admin email and password.' }
    const acct = ACCOUNTS[key]
    if (!acct || acct.role !== 'admin') return { ok: false, error: 'Not an administrator account.' }
    if (acct.password !== password) return { ok: false, error: 'Incorrect administrator password.' }

    persistUser({ email: key, name: acct.name, role: 'admin' })
    return { ok: true, role: 'admin' }
  }

  const loginAsGuest = () => { persistUser({ email: 'guest@demo.com', name: 'Guest User', role: 'user' }); return { ok: true, role: 'user' } }

  const logout = () => { localStorage.removeItem('user'); setUser(null) }

  return (
    <AuthContext.Provider value={{ user, accounts, signup, loginUser, loginAdmin, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
