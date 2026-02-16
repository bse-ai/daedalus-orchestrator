# Process Monitor - Track node.exe process count over time
# Usage: .\monitor-processes.ps1 [-IntervalSeconds 60] [-WarnThreshold 10] [-CriticalThreshold 15]

param(
    [int]$IntervalSeconds = 60,
    [int]$WarnThreshold = 10,
    [int]$CriticalThreshold = 15
)

Write-Host "=== Node.js Process Monitor ===" -ForegroundColor Cyan
Write-Host "Interval: ${IntervalSeconds}s | Warn: >${WarnThreshold} | Critical: >${CriticalThreshold}" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

$baseline = $null
$trend = "STABLE"

while ($true) {
    $processes = Get-Process node -ErrorAction SilentlyContinue
    $count = ($processes | Measure-Object).Count
    $memory = ($processes | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # Determine trend
    if ($baseline -ne $null) {
        if ($count -gt $baseline + 2) {
            $trend = "GROWING"
        } elseif ($count -lt $baseline - 2) {
            $trend = "SHRINKING"
        } else {
            $trend = "STABLE"
        }
    }
    $baseline = $count

    # Color code based on severity
    $color = "Green"
    $status = "OK"
    if ($count -gt $CriticalThreshold) {
        $color = "Red"
        $status = "CRITICAL"
    } elseif ($count -gt $WarnThreshold) {
        $color = "Yellow"
        $status = "WARNING"
    }

    Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
    Write-Host "$status " -NoNewline -ForegroundColor $color
    Write-Host "Processes: $count | Memory: $([math]::Round($memory, 2)) MB | Trend: $trend" -ForegroundColor $color

    if ($count -gt $CriticalThreshold) {
        Write-Host "  WARNING: Process count exceeds critical threshold!" -ForegroundColor Red
        Write-Host "  Top 5 processes by memory:" -ForegroundColor Yellow
        $processes | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 | ForEach-Object {
            $memMB = [math]::Round($_.WorkingSet64 / 1MB, 2)
            Write-Host "    PID $($_.Id): $memMB MB - $($_.CommandLine)" -ForegroundColor Yellow
        }
    }

    Start-Sleep -Seconds $IntervalSeconds
}
