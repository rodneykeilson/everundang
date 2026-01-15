# Deploy monitoring stack to Kubernetes
# Usage: .\deploy-monitoring.ps1

Write-Host "Deploying Monitoring Stack to Kubernetes..." -ForegroundColor Cyan
Write-Host ""

# Check if kubectl is available
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "Error: kubectl not found. Please install kubectl." -ForegroundColor Red
    exit 1
}

# Ensure we are connected to a cluster
kubectl cluster-info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Not connected to a Kubernetes cluster. Please start Docker Desktop (with Kubernetes enabled) or Minikube." -ForegroundColor Red
    exit 1
}

# Create monitoring namespace
Write-Host "Creating monitoring namespace..." -ForegroundColor Cyan
kubectl apply -f monitoring/namespace.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }

# Deploy Prometheus
Write-Host "Deploying Prometheus..." -ForegroundColor Cyan
kubectl apply -f monitoring/prometheus-rbac.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }
kubectl apply -f monitoring/prometheus-config.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }
kubectl apply -f monitoring/prometheus-rules.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }
kubectl apply -f monitoring/prometheus-deployment.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }

# Deploy Grafana
Write-Host "Deploying Grafana..." -ForegroundColor Cyan
kubectl apply -f monitoring/grafana-datasources.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }
kubectl apply -f monitoring/grafana-dashboards-config.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }
kubectl apply -f monitoring/grafana-dashboards.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }
kubectl apply -f monitoring/grafana-deployment.yaml
if ($LASTEXITCODE -ne 0) { exit 1 }

# Wait for deployments
Write-Host ""
Write-Host "Waiting for deployments to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring

Write-Host ""
Write-Host "Monitoring stack deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Access Prometheus:" -ForegroundColor Cyan
Write-Host "   kubectl port-forward -n monitoring svc/prometheus 9090:9090" -ForegroundColor White
Write-Host "   Then open: http://localhost:9090" -ForegroundColor Yellow
Write-Host ""
Write-Host "Access Grafana:" -ForegroundColor Cyan
Write-Host "   kubectl port-forward -n monitoring svc/grafana 3000:3000" -ForegroundColor White
Write-Host "   Then open: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   Default credentials: admin / admin" -ForegroundColor Gray
Write-Host ""
Write-Host "Check status:" -ForegroundColor Cyan
Write-Host "   kubectl get all -n monitoring" -ForegroundColor White
