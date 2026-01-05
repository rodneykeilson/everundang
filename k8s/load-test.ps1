# Load Test Script for EverUndang HPA Demo
# This script generates load to trigger Horizontal Pod Autoscaler

param(
    [Parameter(Mandatory=$false)]
    [int]$DurationSeconds = 120,
    
    [Parameter(Mandatory=$false)]
    [int]$Concurrent = 10,
    
    [Parameter(Mandatory=$false)]
    [string]$TargetUrl = "http://localhost:4000/health"
)

Write-Host "🔥 Starting Load Test for HPA Demo" -ForegroundColor Cyan
Write-Host "Target: $TargetUrl" -ForegroundColor Yellow
Write-Host "Duration: $DurationSeconds seconds" -ForegroundColor Yellow
Write-Host "Concurrent requests: $Concurrent" -ForegroundColor Yellow
Write-Host ""

$endTime = (Get-Date).AddSeconds($DurationSeconds)
$counter = 0

Write-Host "📊 Monitoring HPA in another window..." -ForegroundColor Green
Write-Host "Run this command: kubectl get hpa -w" -ForegroundColor White
Write-Host ""

# Start background jobs to generate load
$jobs = 1..$Concurrent | ForEach-Object {
    Start-Job -ScriptBlock {
        param($url, $endTime)
        
        while ((Get-Date) -lt $endTime) {
            try {
                Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 2 | Out-Null
            } catch {
                # Ignore errors, keep sending requests
            }
            Start-Sleep -Milliseconds 50
        }
    } -ArgumentList $TargetUrl, $endTime
}

# Monitor progress
while ((Get-Date) -lt $endTime) {
    $remaining = ($endTime - (Get-Date)).TotalSeconds
    $counter++
    
    if ($counter % 5 -eq 0) {
        Write-Host "⏱️  $([math]::Round($remaining)) seconds remaining..." -ForegroundColor Cyan
    }
    
    Start-Sleep -Seconds 1
}

# Cleanup
Write-Host ""
Write-Host "🛑 Stopping load test..." -ForegroundColor Yellow
$jobs | Stop-Job
$jobs | Remove-Job

Write-Host "✅ Load test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📈 Check HPA status:" -ForegroundColor Cyan
Write-Host "   kubectl get hpa" -ForegroundColor White
Write-Host ""
Write-Host "📊 Check pod scaling:" -ForegroundColor Cyan
Write-Host "   kubectl get pods" -ForegroundColor White
Write-Host ""
Write-Host "💡 Pods will scale down after 5 minutes of low load" -ForegroundColor Yellow
