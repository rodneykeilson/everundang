#!/bin/bash
# Load Test Script for EverUndang HPA Demo

DURATION=${1:-120}
CONCURRENT=${2:-10}
TARGET_URL=${3:-"http://localhost:4000/health"}

echo "🔥 Starting Load Test for HPA Demo"
echo "Target: $TARGET_URL"
echo "Duration: $DURATION seconds"
echo "Concurrent requests: $CONCURRENT"
echo ""

echo "📊 Monitoring HPA in another window..."
echo "Run this command: kubectl get hpa -w"
echo ""

# Check if apache bench (ab) is available
if ! command -v ab &> /dev/null; then
    echo "❌ Apache Bench (ab) not found. Installing..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Apache Bench should be pre-installed on macOS"
    elif command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        sudo apt-get update && sudo apt-get install -y apache2-utils
    elif command -v yum &> /dev/null; then
        # RHEL/CentOS
        sudo yum install -y httpd-tools
    else
        echo "Please install Apache Bench manually"
        exit 1
    fi
fi

# Calculate total requests
TOTAL_REQUESTS=$((DURATION * CONCURRENT * 20))

echo "🚀 Sending requests..."
ab -n $TOTAL_REQUESTS -c $CONCURRENT -t $DURATION $TARGET_URL

echo ""
echo "✅ Load test complete!"
echo ""
echo "📈 Check HPA status:"
echo "   kubectl get hpa"
echo ""
echo "📊 Check pod scaling:"
echo "   kubectl get pods"
echo ""
echo "💡 Pods will scale down after 5 minutes of low load"
