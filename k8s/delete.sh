#!/bin/bash
# Delete all EverUndang resources from OpenShift/Kubernetes
# Usage: ./delete.sh

set -e

echo "🗑️  Deleting EverUndang resources..."

# Check if kubectl/oc is available
if command -v oc &> /dev/null; then
    CLI="oc"
elif command -v kubectl &> /dev/null; then
    CLI="kubectl"
else
    echo "❌ Error: Neither 'oc' nor 'kubectl' found."
    exit 1
fi

# Delete namespace (this will delete all resources in it)
echo "Deleting namespace 'everundang' and all its resources..."
$CLI delete namespace everundang --ignore-not-found=true

echo "✅ All EverUndang resources deleted!"
