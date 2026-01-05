# Horizontal Pod Autoscaler (HPA) Guide

This guide explains how EverUndang uses Horizontal Pod Autoscaler to automatically scale pods based on CPU and memory usage.

## 📊 What is HPA?

Horizontal Pod Autoscaler automatically scales the number of pods in a deployment based on observed metrics like CPU and memory utilization. This ensures your application can handle traffic spikes while minimizing resource costs during low traffic.

## 🎯 EverUndang HPA Configuration

### Backend HPA
- **Min Replicas**: 2
- **Max Replicas**: 10
- **CPU Target**: 70% utilization
- **Memory Target**: 80% utilization
- **Scale Up**: Add up to 4 pods every 15 seconds (100% increase)
- **Scale Down**: Remove up to 50% of pods every 15 seconds (after 5 min stabilization)

### Frontend HPA
- **Min Replicas**: 2
- **Max Replicas**: 8
- **CPU Target**: 75% utilization
- **Memory Target**: 85% utilization
- **Scale Up**: Add up to 2 pods every 15 seconds (100% increase)
- **Scale Down**: Remove up to 50% of pods every 15 seconds (after 5 min stabilization)

## 🚀 Quick Start

### 1. Verify Metrics Server is Running

```powershell
kubectl get deployment metrics-server -n kube-system
kubectl top nodes
kubectl top pods -n everundang
```

### 2. Check HPA Status

```powershell
# View HPA resources
kubectl get hpa -n everundang

# Watch HPA in real-time
kubectl get hpa -n everundang -w

# Detailed HPA information
kubectl describe hpa backend-hpa -n everundang
kubectl describe hpa frontend-hpa -n everundang
```

### 3. Test Autoscaling

Run the load test script to generate traffic and trigger scaling:

```powershell
# Windows
.\k8s\load-test.ps1

# With custom parameters (duration: 180s, concurrent: 20)
.\k8s\load-test.ps1 -DurationSeconds 180 -Concurrent 20

# Linux/Mac
./k8s/load-test.sh 180 20
```

### 4. Monitor Scaling Events

```powershell
# Watch pods scale up
kubectl get pods -n everundang -w

# View HPA events
kubectl get events -n everundang --sort-by='.lastTimestamp'

# Check current resource usage
kubectl top pods -n everundang
```

## 📈 Expected Behavior

### During Load Test:
1. **Initial State**: 2 backend pods, 2 frontend pods
2. **Load Applied**: CPU/Memory usage increases
3. **Scaling Trigger**: When usage exceeds targets (70% CPU / 80% Memory)
4. **Scale Up**: HPA adds pods (up to 4 at a time for backend)
5. **Stabilization**: Pods distribute load evenly

### After Load Test:
1. **Load Removed**: CPU/Memory usage decreases
2. **Cool Down**: 5-minute stabilization window
3. **Scale Down**: HPA gradually removes excess pods
4. **Return to Min**: Eventually returns to 2 replicas (minimum)

## 🔍 Monitoring Commands

```powershell
# Real-time HPA monitoring
kubectl get hpa -n everundang -w

# Pod resource usage
kubectl top pods -n everundang

# Node resource usage
kubectl top nodes

# HPA metrics details
kubectl get hpa backend-hpa -n everundang -o yaml

# Recent scaling events
kubectl get events -n everundang --field-selector involvedObject.kind=HorizontalPodAutoscaler
```

## ⚙️ Configuration Files

- **Backend HPA**: [k8s/base/backend-hpa.yaml](base/backend-hpa.yaml)
- **Frontend HPA**: [k8s/base/frontend-hpa.yaml](base/frontend-hpa.yaml)

## 🎨 Customizing HPA

### Adjust CPU/Memory Thresholds

Edit the HPA YAML files:

```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70  # Change this value (0-100)
```

### Change Replica Limits

```yaml
spec:
  minReplicas: 2   # Minimum number of pods
  maxReplicas: 10  # Maximum number of pods
```

### Modify Scaling Behavior

```yaml
behavior:
  scaleUp:
    policies:
    - type: Pods
      value: 4        # Add up to 4 pods at once
      periodSeconds: 15
  scaleDown:
    stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
```

After editing, apply changes:

```powershell
kubectl apply -f k8s/base/backend-hpa.yaml
kubectl apply -f k8s/base/frontend-hpa.yaml
```

## 🐛 Troubleshooting

### HPA Shows "unknown" Metrics

**Problem**: `kubectl get hpa` shows `<unknown>` for CPU/memory

**Solution**:
```powershell
# Check if metrics-server is running
kubectl get deployment metrics-server -n kube-system

# Restart metrics-server
kubectl rollout restart deployment metrics-server -n kube-system

# Wait 30 seconds and check again
kubectl get hpa -n everundang
```

### Pods Not Scaling

**Problem**: Load increases but pods don't scale

**Checklist**:
1. Verify metrics are available: `kubectl top pods -n everundang`
2. Check resource requests are set in deployments
3. Verify you haven't hit max replicas
4. Check HPA events: `kubectl describe hpa backend-hpa -n everundang`

### Metrics Server Installation (If Not Installed)

```powershell
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch for Docker Desktop (self-signed certs)
kubectl patch deployment metrics-server -n kube-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

# Verify installation
kubectl get deployment metrics-server -n kube-system
```

## 📊 Understanding HPA Output

```powershell
kubectl get hpa -n everundang
```

Output example:
```
NAME           REFERENCE             TARGETS              MINPODS   MAXPODS   REPLICAS
backend-hpa    Deployment/backend    15%/70%, 25%/80%    2         10        2
frontend-hpa   Deployment/frontend   10%/75%, 20%/85%    2         8         2
```

- **TARGETS**: Current usage / Target threshold (CPU%, Memory%)
- **REPLICAS**: Current number of running pods
- **15%/70%**: CPU is at 15%, target is 70% (no scaling needed)
- **25%/80%**: Memory is at 25%, target is 80% (no scaling needed)

## 🎯 Best Practices

1. **Set Appropriate Thresholds**: Don't set too low (constant scaling) or too high (delayed response)
2. **Define Resource Requests**: HPA needs resource requests to calculate percentages
3. **Use Stabilization Windows**: Prevent rapid scale up/down (flapping)
4. **Monitor Regularly**: Use Prometheus/Grafana for long-term metrics (Step 4)
5. **Test Before Production**: Run load tests to tune HPA parameters

## 🔗 Related Resources

- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Metrics Server GitHub](https://github.com/kubernetes-sigs/metrics-server)
- [HPA Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)

## ✅ Verification Checklist

- [ ] Metrics server is running and collecting data
- [ ] HPA resources are created for backend and frontend
- [ ] `kubectl get hpa` shows actual metrics (not `<unknown>`)
- [ ] Load test triggers pod scaling
- [ ] Pods scale up during high load
- [ ] Pods scale down after load decreases (after 5 min)
- [ ] HPA events show scaling decisions

---