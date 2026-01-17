# Deploy monitoring stack to Kubernetes
# Usage: .\deploy-monitoring.ps1

Write-Host "🔧 Deploying Monitoring Stack to Kubernetes..." -ForegroundColor Cyan
Write-Host ""

# Check if kubectl is available
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: kubectl not found. Please install kubectl." -ForegroundColor Red
    exit 1
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Create monitoring namespace
Write-Host "📦 Creating monitoring namespace..." -ForegroundColor Cyan
kubectl apply -f monitoring/namespace.yaml

# Deploy Prometheus
Write-Host "📊 Deploying Prometheus..." -ForegroundColor Cyan
kubectl apply -f monitoring/prometheus-rbac.yaml
kubectl apply -f monitoring/prometheus-config.yaml
kubectl apply -f monitoring/prometheus-rules.yaml
kubectl apply -f monitoring/prometheus-deployment.yaml

# Deploy Grafana
Write-Host "📈 Deploying Grafana..." -ForegroundColor Cyan
kubectl apply -f monitoring/grafana-datasources.yaml
kubectl apply -f monitoring/grafana-dashboards-config.yaml
kubectl apply -f monitoring/grafana-dashboards.yaml
kubectl apply -f monitoring/grafana-deployment.yaml

# Wait for deployments
Write-Host ""
Write-Host "⏳ Waiting for deployments to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring

Write-Host ""
Write-Host "âœ… Monitoring stack deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "ðŸ“Š Access Prometheus:" -ForegroundColor Cyan
Write-Host "   kubectl port-forward -n monitoring svc/prometheus 9090:9090" -ForegroundColor White
Write-Host "   Then open: http://localhost:9090" -ForegroundColor Yellow
Write-Host ""
Write-Host "ðŸ“ˆ Access Grafana:" -ForegroundColor Cyan
Write-Host "   kubectl port-forward -n monitoring svc/grafana 3000:3000" -ForegroundColor White
Write-Host "   Then open: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   Default credentials: admin / admin" -ForegroundColor Gray
Write-Host ""
Write-Host "ðŸ” Check status:" -ForegroundColor Cyan
Write-Host "   kubectl get all -n monitoring" -ForegroundColor White
