# Frontend — React + Vite (Member 1)

A polished dashboard with **15 themes**, a **login page** (user + admin roles), an
**Admin Console**, image upload, disaster reports, and an alerts view.

## Run it

**Dev (hot reload, separate port):**
```powershell
npm install
copy .env.example .env      # Mac/Linux: cp .env.example .env  (optional — sensible defaults)
npm run dev                 # opens http://localhost:5173, talks to backend on :8000
```

**Production (served by the backend on one port):**
```powershell
npm run build               # outputs dist/, which the backend serves at http://localhost:8000
```

## Login (separate user & admin)

Mock auth (no real backend). Three flows:

- **User login** (`/login`) — demo user `user@demo.com` / `User@123`, **Create an account**
  (new users, stored in `localStorage`), or **Continue as guest**.
- **Admin login** (`/admin-login`, via the **⋮ menu** on the login page) — `admin@demo.com` / `Admin@123`.
- **Sign up** (`/signup`) — new visitors create their own user account.

## Pages

| Page | Who | What it shows |
|------|-----|---------------|
| Dashboard | all | Stat cards, disasters-by-type bars, severity breakdown, recent detections |
| Analyze Image | all | Drag & drop an image → type, confidence, severity, and whether an alert fired |
| Reports | all | Searchable/filterable table of all records + CSV export |
| Alerts | all | Cards for every High-severity detection |
| Admin Console | admin only | System status, data management (seed/clear), registered accounts |

## Themes

Click the palette button (top-right) → pick from **15 themes** (8 light, 7 dark). Use
**Set as default** to choose the startup theme. Default is **White Mist**.
Add/edit themes in [`src/themes.js`](src/themes.js) — each is a full set of CSS variables.

## Structure

```
src/
  main.jsx              app entry (theme + auth providers, router)
  App.jsx               auth routing + app shell (sidebar + pages)
  api.js                calls the backend under /api
  themes.js             15 themes + type/severity colors
  index.css             all styling (CSS-variable driven)
  context/              ThemeContext, AuthContext, StatusContext
  components/           Sidebar, Topbar, StatCard, ThemePicker, ProfileMenu, Badges, Icons
  pages/                Login, Signup, AdminLogin, Dashboard, Upload, Reports, Alerts, Admin
```
