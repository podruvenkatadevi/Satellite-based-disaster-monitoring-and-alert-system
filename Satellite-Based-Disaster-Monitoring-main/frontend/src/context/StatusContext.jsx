import { createContext, useContext } from 'react'

// Shares backend status ({ mock, online }) with any component (Topbar, Upload) without
// threading props through every page.
const StatusContext = createContext({ mock: undefined, online: true })

export const StatusProvider = StatusContext.Provider
export const useStatus = () => useContext(StatusContext)
