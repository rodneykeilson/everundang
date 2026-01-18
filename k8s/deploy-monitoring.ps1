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

# Deploy Kube State Metrics (for pod metrics)
Write-Host "📊 Deploying Kube State Metrics..." -ForegroundColor Cyan
kubectl apply -f monitoring/kube-state-metrics.yaml

# Deploy Grafana
Write-Host "📈 Deploying Grafana..." -ForegroundColor Cyan
kubectl apply -f monitoring/grafana-datasources.yaml
kubectl apply -f monitoring/grafana-dashboards-config.yaml
kubectl apply -f monitoring/grafana-dashboards.yaml
kubectl apply -f monitoring/grafana-deployment.yaml

# Deploy Access (Route or Ingress)
if (Get-Command oc -ErrorAction SilentlyContinue) {
    Write-Host "🌐 Deploying OpenShift Routes for Monitoring..." -ForegroundColor Cyan
    kubectl apply -f monitoring/prometheus-route.yaml
    kubectl apply -f monitoring/grafana-route.yaml
} else {
    Write-Host "🌐 Deploying Ingress for Monitoring..." -ForegroundColor Cyan
    kubectl apply -f monitoring/grafana-ingress.yaml
}

# Wait for deployments
Write-Host ""
Write-Host "⏳ Waiting for deployments to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/kube-state-metrics -n monitoring

Write-Host ""
Write-Host "✅ Monitoring stack deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Access Prometheus:" -ForegroundColor Cyan
if (Get-Command oc -ErrorAction SilentlyContinue) {
    $promHost = & oc get route prometheus -n monitoring -o jsonpath='{.spec.host}'
    Write-Host "   URL: https://$promHost" -ForegroundColor Yellow
} else {
    Write-Host "   kubectl port-forward -n monitoring svc/prometheus 9090:9090" -ForegroundColor White
    Write-Host "   Then open: http://localhost:9090" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "📈 Access Grafana:" -ForegroundColor Cyan
if (Get-Command oc -ErrorAction SilentlyContinue) {
    $grafHost = & oc get route grafana -n monitoring -o jsonpath='{.spec.host}'
    Write-Host "   URL: https://$grafHost" -ForegroundColor Yellow
} else {
    Write-Host "   kubectl port-forward -n monitoring svc/grafana 3000:3000" -ForegroundColor White
    Write-Host "   Then open: http://localhost:3000" -ForegroundColor Yellow
}
Write-Host "   Default credentials: admin / admin" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 Check status:" -ForegroundColor Cyan
Write-Host "   kubectl get all -n monitoring" -ForegroundColor White
