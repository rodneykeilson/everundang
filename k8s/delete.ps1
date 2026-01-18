# Delete all EverUndang resources from OpenShift/Kubernetes
# Usage: .\delete.ps1

Write-Host "🗑️  Deleting EverUndang resources..." -ForegroundColor Yellow

# Check if kubectl/oc is available
$CLI = $null
if (Get-Command oc -ErrorAction SilentlyContinue) {
    $CLI = "oc"
} elseif (Get-Command kubectl -ErrorAction SilentlyContinue) {
    $CLI = "kubectl"
} else {
    Write-Host "❌ Error: Neither 'oc' nor 'kubectl' found." -ForegroundColor Red
    exit 1
}

# Delete namespace (this will delete all resources in it)
Write-Host "🗑️  Deleting namespace 'everundang' and all its resources..." -ForegroundColor Yellow
& $CLI delete namespace everundang --ignore-not-found=true

Write-Host "🗑️  Deleting namespace 'monitoring' and all its resources..." -ForegroundColor Yellow
& $CLI delete namespace monitoring --ignore-not-found=true

Write-Host "✅ All EverUndang resources deleted!" -ForegroundColor Green
