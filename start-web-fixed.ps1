# Start Expo Web Server (Fixed)
Set-Location "D:\projects backup 2025\projects\Project eazyload"
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Green
Write-Host "Starting Expo web server with clear cache..." -ForegroundColor Cyan
Write-Host ""

# Create necessary directories first
New-Item -ItemType Directory -Force -Path ".expo\metro\externals" | Out-Null

# Start Expo
npx expo start --web --clear

Write-Host ""
Write-Host "Server stopped." -ForegroundColor Yellow
pause

