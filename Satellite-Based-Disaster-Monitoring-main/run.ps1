# Start backend + frontend (works for you and teammates on the same network).
$root = $PSScriptRoot
Start-Process powershell -ArgumentList '-NoExit','-Command',"cd '$root\backend'; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "Waiting for backend..."
$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  try {
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2
    if ($r.status -eq 'ok') { $ok = $true; break }
  } catch { }
}
if (-not $ok) {
  Write-Host "WARNING: Backend not responding on :8000. Check the Backend window for errors." -ForegroundColor Yellow
}
Start-Process powershell -ArgumentList '-NoExit','-Command',"cd '$root\frontend'; npm run dev"
Write-Host ""
Write-Host "Started:"
Write-Host "  Backend  -> http://127.0.0.1:8000/api/health"
Write-Host "  Frontend -> http://localhost:5173"
Write-Host ""
Write-Host "Teammates on same Wi-Fi: use your LAN IP shown by Vite (Network: http://x.x.x.x:5173)"
Write-Host "Each person must run BOTH backend and frontend on their own PC, OR use demo mode below."
Write-Host ""
Write-Host "Demo mode (one host, everyone uses browser):"
Write-Host "  cd frontend; npm run build"
Write-Host "  cd backend; python -m uvicorn main:app --host 0.0.0.0 --port 8000"
Write-Host "  Others open http://YOUR_LAN_IP:8000"
