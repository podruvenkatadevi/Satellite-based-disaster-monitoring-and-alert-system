// Theme system. Each theme changes the ENTIRE palette — background hue, surface tone,
// text color, borders, shadow tint AND accent — so themes feel genuinely different,
// not just "an accent on top". Grouped into Light and Dark for the picker.

export const THEMES = {
  // ---------------------------- LIGHT ----------------------------
  beige: {
    label: 'Beige Brown', mode: 'light', swatch: '#8a5a2b',
    vars: {
      '--bg': '#efe6d6', '--surface': '#f8f1e4', '--surface-2': '#eaddc9', '--elevated': '#fdf8ee',
      '--text': '#3b2f24', '--text-dim': '#6f5f4b', '--text-faint': '#9c8a71',
      '--border': 'rgba(90,66,40,0.15)', '--border-strong': 'rgba(90,66,40,0.26)',
      '--accent': '#8a5a2b', '--accent-weak': 'rgba(138,90,43,0.13)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(80,58,32,0.08), 0 10px 28px rgba(80,58,32,0.10)', '--ring': 'rgba(138,90,43,0.28)',
    },
  },
  whitemist: {
    label: 'White Mist', mode: 'light', swatch: '#6b8caf',
    vars: {
      '--bg': '#eceff3', '--surface': '#f8fafc', '--surface-2': '#e6ebf1', '--elevated': '#ffffff',
      '--text': '#1e2733', '--text-dim': '#5b6773', '--text-faint': '#95a0ac',
      '--border': 'rgba(30,40,55,0.10)', '--border-strong': 'rgba(30,40,55,0.18)',
      '--accent': '#5f83a8', '--accent-weak': 'rgba(95,131,168,0.14)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(30,40,55,0.05), 0 8px 24px rgba(30,40,55,0.07)', '--ring': 'rgba(95,131,168,0.30)',
    },
  },
  bluewhite: {
    label: 'Blue & White', mode: 'light', swatch: '#1d6fe0',
    vars: {
      '--bg': '#e9f1fb', '--surface': '#f6faff', '--surface-2': '#dce8f7', '--elevated': '#ffffff',
      '--text': '#0f2340', '--text-dim': '#496483', '--text-faint': '#88a1bf',
      '--border': 'rgba(15,45,80,0.11)', '--border-strong': 'rgba(15,45,80,0.20)',
      '--accent': '#1d6fe0', '--accent-weak': 'rgba(29,111,224,0.12)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(15,45,80,0.06), 0 8px 24px rgba(15,45,80,0.09)', '--ring': 'rgba(29,111,224,0.28)',
    },
  },
  greywhite: {
    label: 'Grey White', mode: 'light', swatch: '#64748b',
    vars: {
      '--bg': '#e9ebee', '--surface': '#f6f7f9', '--surface-2': '#e0e3e8', '--elevated': '#ffffff',
      '--text': '#20252c', '--text-dim': '#59616b', '--text-faint': '#98a0a9',
      '--border': 'rgba(20,30,42,0.10)', '--border-strong': 'rgba(20,30,42,0.18)',
      '--accent': '#475569', '--accent-weak': 'rgba(71,85,105,0.13)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(20,30,42,0.06), 0 8px 24px rgba(20,30,42,0.08)', '--ring': 'rgba(71,85,105,0.28)',
    },
  },
  sand: {
    label: 'Sand', mode: 'light', swatch: '#c2602f',
    vars: {
      '--bg': '#f3ead8', '--surface': '#fbf5e8', '--surface-2': '#ecdfc7', '--elevated': '#fffaf0',
      '--text': '#4a3a26', '--text-dim': '#7a6647', '--text-faint': '#a89370',
      '--border': 'rgba(110,80,40,0.15)', '--border-strong': 'rgba(110,80,40,0.26)',
      '--accent': '#c2602f', '--accent-weak': 'rgba(194,96,47,0.13)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(110,80,40,0.08), 0 10px 26px rgba(110,80,40,0.10)', '--ring': 'rgba(194,96,47,0.28)',
    },
  },
  mint: {
    label: 'Mint', mode: 'light', swatch: '#10b981',
    vars: {
      '--bg': '#e5f2ec', '--surface': '#f3fbf7', '--surface-2': '#d8ebe1', '--elevated': '#f8fefb',
      '--text': '#123528', '--text-dim': '#476b5c', '--text-faint': '#84a596',
      '--border': 'rgba(20,70,50,0.12)', '--border-strong': 'rgba(20,70,50,0.20)',
      '--accent': '#0f9d6f', '--accent-weak': 'rgba(15,157,111,0.13)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(20,70,50,0.06), 0 8px 24px rgba(20,70,50,0.09)', '--ring': 'rgba(15,157,111,0.28)',
    },
  },
  rose: {
    label: 'Rose Quartz', mode: 'light', swatch: '#e35d82',
    vars: {
      '--bg': '#f7ecec', '--surface': '#fdf5f5', '--surface-2': '#efdedf', '--elevated': '#fffafa',
      '--text': '#3d2529', '--text-dim': '#755055', '--text-faint': '#b08c91',
      '--border': 'rgba(110,50,60,0.13)', '--border-strong': 'rgba(110,50,60,0.22)',
      '--accent': '#c0466a', '--accent-weak': 'rgba(192,70,106,0.12)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(110,50,60,0.06), 0 8px 24px rgba(110,50,60,0.09)', '--ring': 'rgba(192,70,106,0.28)',
    },
  },
  arctic: {
    label: 'Arctic', mode: 'light', swatch: '#4f46e5',
    vars: {
      '--bg': '#f4f6f9', '--surface': '#ffffff', '--surface-2': '#eef1f6', '--elevated': '#ffffff',
      '--text': '#0f1729', '--text-dim': '#5b6472', '--text-faint': '#98a1af',
      '--border': 'rgba(15,23,41,0.09)', '--border-strong': 'rgba(15,23,41,0.17)',
      '--accent': '#4f46e5', '--accent-weak': 'rgba(79,70,229,0.10)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(15,23,41,0.06), 0 8px 24px rgba(15,23,41,0.07)', '--ring': 'rgba(79,70,229,0.30)',
    },
  },

  // ---------------------------- DARK ----------------------------
  graphite: {
    label: 'Graphite', mode: 'dark', swatch: '#3b82f6',
    vars: {
      '--bg': '#0c0e12', '--surface': '#14171d', '--surface-2': '#1a1e26', '--elevated': '#1f242d',
      '--text': '#e7e9ee', '--text-dim': '#9298a3', '--text-faint': '#5f6672',
      '--border': 'rgba(255,255,255,0.07)', '--border-strong': 'rgba(255,255,255,0.12)',
      '--accent': '#3b82f6', '--accent-weak': 'rgba(59,130,246,0.14)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.28)', '--ring': 'rgba(59,130,246,0.35)',
    },
  },
  slate: {
    label: 'Slate', mode: 'dark', swatch: '#38bdf8',
    vars: {
      '--bg': '#0e131a', '--surface': '#161d27', '--surface-2': '#1c2530', '--elevated': '#212b38',
      '--text': '#e4e9f0', '--text-dim': '#8b97a8', '--text-faint': '#5c6778',
      '--border': 'rgba(255,255,255,0.07)', '--border-strong': 'rgba(255,255,255,0.13)',
      '--accent': '#38bdf8', '--accent-weak': 'rgba(56,189,248,0.14)', '--accent-text': '#04121a',
      '--shadow': '0 1px 2px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.3)', '--ring': 'rgba(56,189,248,0.35)',
    },
  },
  onyx: {
    label: 'Onyx', mode: 'dark', swatch: '#14b8a6',
    vars: {
      '--bg': '#08090a', '--surface': '#111315', '--surface-2': '#171a1c', '--elevated': '#1c2022',
      '--text': '#e8eaea', '--text-dim': '#8d9496', '--text-faint': '#5b6264',
      '--border': 'rgba(255,255,255,0.06)', '--border-strong': 'rgba(255,255,255,0.11)',
      '--accent': '#14b8a6', '--accent-weak': 'rgba(20,184,166,0.14)', '--accent-text': '#04110f',
      '--shadow': '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.32)', '--ring': 'rgba(20,184,166,0.35)',
    },
  },
  indigo: {
    label: 'Indigo Night', mode: 'dark', swatch: '#8b5cf6',
    vars: {
      '--bg': '#0b0d16', '--surface': '#131621', '--surface-2': '#181c2b', '--elevated': '#1d2233',
      '--text': '#e6e8f2', '--text-dim': '#8f95ab', '--text-faint': '#5c6178',
      '--border': 'rgba(255,255,255,0.07)', '--border-strong': 'rgba(255,255,255,0.13)',
      '--accent': '#8b5cf6', '--accent-weak': 'rgba(139,92,246,0.15)', '--accent-text': '#ffffff',
      '--shadow': '0 1px 2px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.3)', '--ring': 'rgba(139,92,246,0.35)',
    },
  },
  espresso: {
    label: 'Espresso', mode: 'dark', swatch: '#d99a52',
    vars: {
      '--bg': '#17110c', '--surface': '#1f1811', '--surface-2': '#271e15', '--elevated': '#2c2118',
      '--text': '#efe4d6', '--text-dim': '#b09a83', '--text-faint': '#7c6b58',
      '--border': 'rgba(255,240,220,0.08)', '--border-strong': 'rgba(255,240,220,0.15)',
      '--accent': '#d99a52', '--accent-weak': 'rgba(217,154,82,0.15)', '--accent-text': '#201509',
      '--shadow': '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.34)', '--ring': 'rgba(217,154,82,0.32)',
    },
  },
  ember: {
    label: 'Orange Ember', mode: 'dark', swatch: '#f97316',
    vars: {
      '--bg': '#14100d', '--surface': '#1c1712', '--surface-2': '#241d16', '--elevated': '#29211a',
      '--text': '#f0e7e0', '--text-dim': '#b29c8d', '--text-faint': '#7d6c5e',
      '--border': 'rgba(255,235,220,0.08)', '--border-strong': 'rgba(255,235,220,0.15)',
      '--accent': '#f97316', '--accent-weak': 'rgba(249,115,22,0.15)', '--accent-text': '#1a0f06',
      '--shadow': '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.34)', '--ring': 'rgba(249,115,22,0.32)',
    },
  },
  forest: {
    label: 'Forest', mode: 'dark', swatch: '#3fbf6f',
    vars: {
      '--bg': '#0b130e', '--surface': '#111c15', '--surface-2': '#16241b', '--elevated': '#1a2b20',
      '--text': '#e3ede6', '--text-dim': '#8ea89a', '--text-faint': '#5e7768',
      '--border': 'rgba(230,255,240,0.07)', '--border-strong': 'rgba(230,255,240,0.13)',
      '--accent': '#3fbf6f', '--accent-weak': 'rgba(63,191,111,0.14)', '--accent-text': '#04140a',
      '--shadow': '0 1px 2px rgba(0,0,0,0.48), 0 8px 24px rgba(0,0,0,0.32)', '--ring': 'rgba(63,191,111,0.32)',
    },
  },
}

// Default theme when the user hasn't chosen one yet.
export const DEFAULT_THEME = 'whitemist'

export const TYPE_COLORS = { Flood: '#3b82f6', Fire: '#f97316', Cyclone: '#8b5cf6', Normal: '#22c55e' }
export const SEVERITY_COLORS = { High: '#e5484d', Medium: '#f5a524', Low: '#30a46c' }
export const TYPE_ICONS = { Flood: 'droplet', Fire: 'flame', Cyclone: 'wind', Normal: 'shieldCheck' }
