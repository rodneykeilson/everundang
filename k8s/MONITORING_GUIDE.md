# Monitoring Stack Guide - Prometheus & Grafana

Complete guide for monitoring EverUndang with Prometheus and Grafana on Kubernetes.

## 📊 Overview

The monitoring stack provides:
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization dashboards
- **Pre-configured Dashboards**: EverUndang-specific metrics
- **Alerting Rules**: Critical system alerts
- **24/7 Monitoring**: Continuous uptime tracking

## 🚀 Quick Start

### 1. Deploy Monitoring Stack

```powershell
# Windows
cd k8s
.\deploy-monitoring.ps1

# Linux/Mac
./deploy-monitoring.sh
```

### 2. Access Prometheus

```powershell
# Start port forwarding
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Open in browser
# http://localhost:9090
```

### 3. Access Grafana

```powershell
# Start port forwarding
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Open in browser
# http://localhost:3000

# Default credentials:
# Username: admin
# Password: admin
```

## 📈 What Gets Monitored

### Application Metrics
- **Backend API**
  - CPU & Memory usage per pod
  - Request rates
  - Response times
  - Error rates

- **Frontend**
  - CPU & Memory usage per pod
  - Active connections
  - Static file serving

- **PostgreSQL Database**
  - Connection count
  - Query performance
  - Storage usage
  - Replication status

### Infrastructure Metrics
- **Kubernetes Cluster**
  - Node resources (CPU, memory, disk)
  - Pod status and health
  - Container restarts
  - Network I/O

- **HPA (Horizontal Pod Autoscaler)**
  - Current vs desired replicas
  - Scaling events
  - Resource utilization triggers

## 🎨 Pre-built Dashboards

### 1. EverUndang Overview Dashboard
**Location**: Grafana → Dashboards → EverUndang - Overview

**Panels**:
- Backend Pod CPU Usage (graph)
- Backend Pod Memory Usage (graph)
- Frontend Pod CPU Usage (graph)
- Frontend Pod Memory Usage (graph)
- Backend Replicas (stat)
- Frontend Replicas (stat)
- Database Status (stat)
- HPA Current vs Desired Replicas (graph)

### 2. Kubernetes Cluster Dashboard
**Location**: Grafana → Dashboards → Kubernetes Cluster - EverUndang

**Panels**:
- Cluster CPU Usage
- Cluster Memory Usage
- Pod Status Table

## 🔍 Using Prometheus

### Accessing Prometheus UI

1. Port forward: `kubectl port-forward -n monitoring svc/prometheus 9090:9090`
2. Open: http://localhost:9090
3. Use the **Graph** tab for queries

### Useful PromQL Queries

#### Check if services are up:
```promql
up{job="everundang-backend"}
up{job="everundang-frontend"}
```

#### Backend CPU usage:
```promql
rate(container_cpu_usage_seconds_total{pod=~"backend-.*"}[5m])
```

#### Backend memory usage:
```promql
container_memory_usage_bytes{pod=~"backend-.*"}
```

#### HPA current replicas:
```promql
kube_horizontalpodautoscaler_status_current_replicas{namespace="everundang"}
```

#### Pod restart count:
```promql
kube_pod_container_status_restarts_total{namespace="everundang"}
```

### Exploring Metrics

1. Go to **Graph** tab
2. Click **Graph** to see available metrics
3. Type to autocomplete metric names
4. Use `{}` for label filtering: `metric_name{label="value"}`

## 📊 Using Grafana

### First Login

1. Open http://localhost:3000
2. Login with: `admin` / `admin`
3. You'll be prompted to change password (optional for dev)

### Viewing Dashboards

1. Click **Dashboards** (☰ menu)
2. Select a dashboard:
   - **EverUndang - Overview**
   - **Kubernetes Cluster - EverUndang**

### Creating Custom Dashboards

1. Click **+** → **Dashboard**
2. Click **Add visualization**
3. Select **Prometheus** as data source
4. Enter PromQL query
5. Customize visualization
6. Click **Apply**
7. Click **Save dashboard**

### Example Panel Setup

**Panel**: Backend Request Rate

1. Query: `rate(http_requests_total{job="everundang-backend"}[5m])`
2. Legend: `{{pod}}`
3. Unit: requests/sec
4. Panel type: Graph

## 🚨 Alerting Rules

Pre-configured alerts in Prometheus:

### Critical Alerts

| Alert Name | Condition | Duration | Description |
|------------|-----------|----------|-------------|
| `BackendDown` | Backend unavailable | 2 minutes | Backend service not responding |
| `FrontendDown` | Frontend unavailable | 2 minutes | Frontend service not responding |
| `PostgresDown` | Database unavailable | 1 minute | Database connection lost |
| `PodCrashLooping` | Restarts > 0 | 5 minutes | Pod restarting repeatedly |

### Warning Alerts

| Alert Name | Condition | Duration | Description |
|------------|-----------|----------|-------------|
| `BackendHighMemory` | Memory > 85% | 5 minutes | Backend memory usage high |
| `BackendHighCPU` | CPU > 80% | 5 minutes | Backend CPU usage high |
| `HPAMaxReplicasReached` | At max replicas | 5 minutes | HPA cannot scale further |
| `PodNotReady` | Pod not ready | 5 minutes | Pod health check failing |

### Viewing Alerts

1. Open Prometheus: http://localhost:9090
2. Click **Alerts** tab
3. See active and firing alerts

### Testing Alerts

Trigger a test alert by scaling down:

```powershell
# Stop backend to trigger BackendDown alert
kubectl scale deployment/backend --replicas=0 -n everundang

# Wait 2 minutes, check alerts in Prometheus

# Restore backend
kubectl scale deployment/backend --replicas=2 -n everundang
```

## 📡 Monitoring Commands

### Check Prometheus Status

```powershell
# View pods
kubectl get pods -n monitoring

# Check logs
kubectl logs -f deployment/prometheus -n monitoring

# Check config
kubectl get configmap prometheus-config -n monitoring -o yaml
```

### Check Grafana Status

```powershell
# View pods
kubectl get pods -n monitoring -l app=grafana

# Check logs
kubectl logs -f deployment/grafana -n monitoring

# Get admin password (if changed)
kubectl get secret grafana-admin -n monitoring -o jsonpath='{.data.password}' | base64 -d
```

### Restart Services

```powershell
# Restart Prometheus
kubectl rollout restart deployment/prometheus -n monitoring

# Restart Grafana
kubectl rollout restart deployment/grafana -n monitoring
```

## 🔧 Configuration

### Prometheus Configuration

**File**: [k8s/monitoring/prometheus-config.yaml](monitoring/prometheus-config.yaml)

**Key settings**:
- `scrape_interval`: How often to collect metrics (15s)
- `evaluation_interval`: How often to evaluate rules (15s)
- `scrape_configs`: What to monitor

### Grafana Data Sources

**File**: [k8s/monitoring/grafana-datasources.yaml](monitoring/grafana-datasources.yaml)

Prometheus is pre-configured as the default data source.

### Alert Rules

**File**: [k8s/monitoring/prometheus-rules.yaml](monitoring/prometheus-rules.yaml)

Add custom rules:

```yaml
- alert: CustomAlert
  expr: your_promql_expression > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Alert summary"
    description: "Alert description"
```

After editing, apply changes:

```powershell
kubectl apply -f k8s/monitoring/prometheus-rules.yaml
```

## 📈 24/7 Uptime Monitoring

### Verify Continuous Monitoring

```promql
# Check Prometheus uptime
up{job="prometheus"}

# Time since last scrape
time() - timestamp(up{job="everundang-backend"})

# Data retention (15 days configured)
prometheus_tsdb_retention_limit_seconds
```

### Data Persistence

Current setup uses `emptyDir` volumes (data lost on pod restart).

**For production**, add persistent storage:

```yaml
volumes:
- name: prometheus-storage
  persistentVolumeClaim:
    claimName: prometheus-pvc
```

## 🎯 Best Practices

1. **Regular Dashboard Review**: Check dashboards daily
2. **Alert Tuning**: Adjust thresholds to reduce noise
3. **Resource Monitoring**: Watch HPA and scaling patterns
4. **Data Retention**: Ensure enough storage for metrics
5. **Backup Dashboards**: Export and version control
6. **Alert Response**: Document response procedures

## 🐛 Troubleshooting

### Prometheus Not Collecting Metrics

```powershell
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open http://localhost:9090/targets

# Check service discovery
# Go to Status → Service Discovery

# Verify RBAC permissions
kubectl auth can-i list pods --as=system:serviceaccount:monitoring:prometheus
```

### Grafana Can't Connect to Prometheus

```powershell
# Test connection from Grafana pod
kubectl exec -it deployment/grafana -n monitoring -- \
  curl http://prometheus:9090/api/v1/status/config

# Check data source in Grafana
# Settings → Data Sources → Prometheus → Test
```

### No Data in Dashboards

1. Check Prometheus has data: http://localhost:9090/graph
2. Run query: `up`
3. If empty, check Prometheus logs
4. Verify targets are healthy
5. Check firewall/network policies

### Alerts Not Firing

```powershell
# Check alert rules loaded
kubectl get configmap prometheus-rules -n monitoring

# View Prometheus logs
kubectl logs -f deployment/prometheus -n monitoring | grep -i alert

# Manually test alert expression
# Run the PromQL in Prometheus UI
```

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)

## 🔗 Related Files

- Monitoring manifests: [k8s/monitoring/](monitoring/)
- Deployment script: [deploy-monitoring.ps1](deploy-monitoring.ps1)
- Main README: [README.md](README.md)

## ✅ Verification Checklist

- [ ] Monitoring namespace created
- [ ] Prometheus deployed and running
- [ ] Grafana deployed and running
- [ ] Can access Prometheus UI (port 9090)
- [ ] Can access Grafana UI (port 3000)
- [ ] Prometheus collecting metrics from all targets
- [ ] Dashboards display data correctly
- [ ] Alert rules loaded in Prometheus
- [ ] Test alerts can be triggered
- [ ] Data persists after pod restarts (if PVC configured)

---

**Congratulations!** You now have full observability into your EverUndang application with Prometheus and Grafana! 🎉
