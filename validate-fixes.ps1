# Validate Process Registry Fixes
# Checks that all 6 critical fixes have been applied

Write-Host "=== Validating Process Registry Fixes ===" -ForegroundColor Cyan

$errors = @()
$warnings = @()

# Fix #1: Process cleanup in moveToFinished
Write-Host "`nChecking Fix #1: Process cleanup in moveToFinished()..." -NoNewline
$content = Get-Content "src\agents\bash-process-registry.ts" -Raw
if ($content -match "CRITICAL FIX: Always ensure child process is cleaned up") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " MISSING" -ForegroundColor Red
    $errors += "Fix #1: Process cleanup not found in moveToFinished()"
}

# Fix #2: Shutdown handlers
Write-Host "Checking Fix #2: Shutdown handlers..." -NoNewline
if ($content -match "killAllRunningSessions" -and $content -match "registerShutdownHandlers") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " MISSING" -ForegroundColor Red
    $errors += "Fix #2: Shutdown handlers not found"
}

# Fix #3: Process monitoring
Write-Host "Checking Fix #3: Process monitoring..." -NoNewline
if ($content -match "PROCESS LEAK WARNING") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " MISSING" -ForegroundColor Red
    $errors += "Fix #3: Process monitoring not found"
}

# Fix #4: Stats export
Write-Host "Checking Fix #4: Stats export function..." -NoNewline
if ($content -match "export function getProcessStats") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " MISSING" -ForegroundColor Red
    $errors += "Fix #4: getProcessStats() function not found"
}

# Fix #5: System prompt updates
Write-Host "Checking Fix #5: System prompt cleanup guidance..." -NoNewline
$promptContent = Get-Content "src\agents\system-prompt.ts" -Raw
if ($promptContent -match "Resource Cleanup" -and $promptContent -match "Resource leaks can cause the gateway to run out of memory") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " MISSING" -ForegroundColor Red
    $errors += "Fix #5: System prompt cleanup guidance not found"
}

# Fix #6: Gateway shutdown integration
Write-Host "Checking Fix #6: Gateway shutdown integration..." -NoNewline
$closeContent = Get-Content "src\gateway\server-close.ts" -Raw
if ($closeContent -match "Clean up all running bash processes" -and $closeContent -match "killAllRunningSessions") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " MISSING" -ForegroundColor Red
    $errors += "Fix #6: Gateway shutdown integration not found"
}

# Check current process count
Write-Host "`nChecking current process count..." -NoNewline
$processCount = (Get-Process node -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host " $processCount processes"

if ($processCount -gt 25) {
    Write-Host "  CRITICAL: Process count is high ($processCount > 25)" -ForegroundColor Red
    $errors += "Current process count is critically high (memory leak likely)"
} elseif ($processCount -gt 20) {
    Write-Host "  WARNING: Process count is elevated ($processCount > 20)" -ForegroundColor Yellow
    $warnings += "Current process count is elevated (monitor closely)"
} else {
    Write-Host "  OK: Process count is healthy ($processCount <= 20)" -ForegroundColor Green
}

# Summary
Write-Host "`n=== Validation Summary ===" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "All fixes applied successfully!" -ForegroundColor Green
    if ($warnings.Count -gt 0) {
        Write-Host "`nWarnings:" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
    exit 0
} else {
    Write-Host "Validation FAILED" -ForegroundColor Red
    Write-Host "`nErrors:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    if ($warnings.Count -gt 0) {
        Write-Host "`nWarnings:" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
    exit 1
}
