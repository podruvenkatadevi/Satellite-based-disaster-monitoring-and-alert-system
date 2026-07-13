@echo off
cd /d "%~dp0"
start "Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 2 /nobreak >nul
start "Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Backend:  http://127.0.0.1:8000/api/health
echo Frontend: http://localhost:5173
echo.
echo Each teammate needs backend + frontend running on their PC.
echo Or build once and share: npm run build in frontend, then uvicorn in backend on 0.0.0.0:8000
