#!/bin/bash
# Deploy EverUndang to OpenShift/Kubernetes
# Usage: ./deploy.sh [development|production]

set -e

ENV=${1:-development}

echo "🚀 Deploying EverUndang to $ENV environment..."

# Check if kubectl/oc is available
if command -v oc &> /dev/null; then
    CLI="oc"
    echo "✅ Using OpenShift CLI (oc)"
elif command -v kubectl &> /dev/null; then
    CLI="kubectl"
    echo "✅ Using Kubernetes CLI (kubectl)"
else
    echo "❌ Error: Neither 'oc' nor 'kubectl' found. Please install one of them."
    exit 1
fi

# Check if kustomize is available
if ! command -v kustomize &> /dev/null; then
    echo "❌ Error: 'kustomize' not found. Please install kustomize."
    echo "   Install: https://kubectl.docs.kubernetes.io/installation/kustomize/"
    exit 1
fi

# Create namespace if it doesn't exist
echo "📦 Creating namespace..."
$CLI apply -f k8s/base/namespace.yaml

# Apply manifests using kustomize
echo "📋 Applying manifests for $ENV..."
kustomize build k8s/overlays/$ENV | $CLI apply -f -

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 Check deployment status:"
echo "   $CLI get all -n everundang"
echo ""
echo "📊 Check pod logs:"
echo "   $CLI logs -f deployment/backend -n everundang"
echo "   $CLI logs -f deployment/frontend -n everundang"
echo ""

if [ "$CLI" = "oc" ]; then
    echo "🌐 Get Routes:"
    echo "   $CLI get routes -n everundang"
    echo ""
    echo "   Frontend URL: https://$(oc get route frontend -n everundang -o jsonpath='{.spec.host}' 2>/dev/null || echo 'not-created-yet')"
    echo "   Backend URL:  https://$(oc get route backend -n everundang -o jsonpath='{.spec.host}' 2>/dev/null || echo 'not-created-yet')"
else
    echo "🌐 Get Ingress:"
    echo "   $CLI get ingress -n everundang"
fi
