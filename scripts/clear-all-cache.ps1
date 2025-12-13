# Clear All Caches Script for Windows
# Run with: .\scripts\clear-all-cache.ps1

Write-Host "🧹 Clearing all caches..." -ForegroundColor Cyan

# Next.js cache
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Cleared .next folder" -ForegroundColor Green
}

# Node modules cache
if (Test-Path node_modules/.cache) {
    Remove-Item -Recurse -Force node_modules/.cache
    Write-Host "✅ Cleared node_modules/.cache" -ForegroundColor Green
}

# Turbo cache
if (Test-Path .turbo) {
    Remove-Item -Recurse -Force .turbo
    Write-Host "✅ Cleared .turbo folder" -ForegroundColor Green
}

# TypeScript build info
if (Test-Path tsconfig.tsbuildinfo) {
    Remove-Item -Force tsconfig.tsbuildinfo
    Write-Host "✅ Cleared TypeScript build info" -ForegroundColor Green
}

# ESLint cache
if (Test-Path .eslintcache) {
    Remove-Item -Force .eslintcache
    Write-Host "✅ Cleared ESLint cache" -ForegroundColor Green
}

# Build output folders
if (Test-Path out) {
    Remove-Item -Recurse -Force out
    Write-Host "✅ Cleared out folder" -ForegroundColor Green
}

if (Test-Path dist) {
    Remove-Item -Recurse -Force dist
    Write-Host "✅ Cleared dist folder" -ForegroundColor Green
}

Write-Host "`n✨ All caches cleared! You can now run 'npm run dev' fresh." -ForegroundColor Green

