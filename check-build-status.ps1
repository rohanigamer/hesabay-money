# Check EAS Build Status
Write-Host "🔍 Checking build status..." -ForegroundColor Cyan
Write-Host ""

cd "D:\projects backup 2025\projects\Project eazyload"
eas build:list --limit 3

Write-Host ""
Write-Host "✅ To see full logs, visit:" -ForegroundColor Green
Write-Host "https://expo.dev/accounts/rohanigamer/projects/hesabay-money/builds" -ForegroundColor Blue

