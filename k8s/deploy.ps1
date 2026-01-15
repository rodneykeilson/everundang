# Deploy EverUndang to OpenShift/Kubernetes
# Usage: .\deploy.ps1 [development|production]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('development','production')]
    [string]$Environment = 'development'
)

Write-Host "🚀 Deploying EverUndang to $Environment environment..." -ForegroundColor Cyan

# Check if kubectl/oc is available
$CLI = $null
if (Get-Command oc -ErrorAction SilentlyContinue) {
    $CLI = "oc"
    Write-Host "✅ Using OpenShift CLI (oc)" -ForegroundColor Green
} elseif (Get-Command kubectl -ErrorAction SilentlyContinue) {
    $CLI = "kubectl"
    Write-Host "✅ Using Kubernetes CLI (kubectl)" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Neither 'oc' nor 'kubectl' found. Please install one of them." -ForegroundColor Red
    exit 1
}

# Check if kustomize is available
if (-not (Get-Command kustomize -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: 'kustomize' not found. Please install kustomize." -ForegroundColor Red
    Write-Host "   Install: https://kubectl.docs.kubernetes.io/installation/kustomize/" -ForegroundColor Yellow
    exit 1
}

# Create namespace if it doesn't exist
Write-Host "📦 Creating namespace..." -ForegroundColor Cyan
& $CLI apply -f base/namespace.yaml

# Apply manifests using kustomize
Write-Host "📋 Applying manifests for $Environment..." -ForegroundColor Cyan
kustomize build overlays/$Environment | & $CLI apply -f -

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Check deployment status:" -ForegroundColor Cyan
Write-Host "   $CLI get all -n everundang" -ForegroundColor Yellow
Write-Host ""
Write-Host "📊 Check pod logs:" -ForegroundColor Cyan
Write-Host "   $CLI logs -f deployment/backend -n everundang" -ForegroundColor Yellow
Write-Host "   $CLI logs -f deployment/frontend -n everundang" -ForegroundColor Yellow
Write-Host ""

if ($CLI -eq "oc") {
    Write-Host "🌐 Get Routes:" -ForegroundColor Cyan
    Write-Host "   $CLI get routes -n everundang" -ForegroundColor Yellow
    Write-Host ""
    
    $frontendHost = & oc get route frontend -n everundang -o jsonpath='{.spec.host}' 2>$null
    $backendHost = & oc get route backend -n everundang -o jsonpath='{.spec.host}' 2>$null
    
    if ($frontendHost) {
        Write-Host "   Frontend URL: https://$frontendHost" -ForegroundColor Green
    }
    if ($backendHost) {
        Write-Host "   Backend URL:  https://$backendHost" -ForegroundColor Green
    }
} else {
    Write-Host "🌐 Get Ingress:" -ForegroundColor Cyan
    Write-Host "   $CLI get ingress -n everundang" -ForegroundColor Yellow
}
