#!/bin/bash
# Deploy monitoring stack to Kubernetes
# Usage: ./deploy-monitoring.sh

set -e

echo "🔧 Deploying Monitoring Stack to Kubernetes..."
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ Error: kubectl not found. Please install kubectl."
    exit 1
fi

# Create monitoring namespace
echo "📦 Creating monitoring namespace..."
kubectl apply -f monitoring/namespace.yaml

# Deploy Prometheus
echo "📊 Deploying Prometheus..."
kubectl apply -f monitoring/prometheus-rbac.yaml
kubectl apply -f monitoring/prometheus-config.yaml
kubectl apply -f monitoring/prometheus-rules.yaml
kubectl apply -f monitoring/prometheus-deployment.yaml

# Deploy Grafana
echo "📈 Deploying Grafana..."
kubectl apply -f monitoring/grafana-datasources.yaml
kubectl apply -f monitoring/grafana-dashboards-config.yaml
kubectl apply -f monitoring/grafana-dashboards.yaml
kubectl apply -f monitoring/grafana-deployment.yaml

# Wait for deployments
echo ""
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring

echo ""
echo "✅ Monitoring stack deployed successfully!"
echo ""
echo "📊 Access Prometheus:"
echo "   kubectl port-forward -n monitoring svc/prometheus 9090:9090"
echo "   Then open: http://localhost:9090"
echo ""
echo "📈 Access Grafana:"
echo "   kubectl port-forward -n monitoring svc/grafana 3000:3000"
echo "   Then open: http://localhost:3000"
echo "   Default credentials: admin / admin"
echo ""
echo "🔍 Check status:"
echo "   kubectl get all -n monitoring"
