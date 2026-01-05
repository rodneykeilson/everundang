# EverUndang - OpenShift/Kubernetes Deployment Guide

This directory contains Kubernetes manifests and OpenShift configurations for deploying the EverUndang application.

## 📁 Directory Structure

```
k8s/
├── base/                           # Base Kubernetes manifests
│   ├── namespace.yaml              # Namespace definition
│   ├── postgres-*.yaml             # PostgreSQL database resources
│   ├── backend-*.yaml              # Backend API resources
│   ├── backend-hpa.yaml            # Backend autoscaling
│   ├── frontend-*.yaml             # Frontend SPA resources
│   ├── frontend-hpa.yaml           # Frontend autoscaling
│   ├── *-route.yaml                # OpenShift Routes
│   ├── ingress.yaml                # Kubernetes Ingress (alternative)
│   └── kustomization.yaml          # Base kustomization
├── overlays/
│   ├── development/                # Development environment overrides
│   │   ├── kustomization.yaml
│   │   └── replicas-patch.yaml
│   └── production/                 # Production environment overrides
│       ├── kustomization.yaml
│       ├── replicas-patch.yaml
│       └── resources-patch.yaml
├── deploy.sh / deploy.ps1          # Deployment scripts
├── delete.sh / delete.ps1          # Cleanup scripts
├── load-test.sh / load-test.ps1    # HPA load testing
├── HPA_GUIDE.md                    # Autoscaling documentation
└── README.md                       # This file
```

## 🚀 Quick Start

### Prerequisites

1. **OpenShift CLI (`oc`) or Kubernetes CLI (`kubectl`)**
   - OpenShift: https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html
   - Kubernetes: https://kubernetes.io/docs/tasks/tools/

2. **Kustomize**
   ```powershell
   # Windows (via Chocolatey)
   choco install kustomize

   # macOS
   brew install kustomize

   # Linux
   curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
   ```

3. **Access to an OpenShift or Kubernetes cluster**
   ```powershell
   # Login to OpenShift
   oc login https://your-openshift-cluster.com

   # Or configure kubectl context
   kubectl config use-context your-k8s-context
   ```

### Deploy to Development

```powershell
# Windows
.\k8s\deploy.ps1 development

# Linux/Mac
./k8s/deploy.sh development
```

### Deploy to Production

```powershell
# Windows
.\k8s\deploy.ps1 production

# Linux/Mac
./k8s/deploy.sh production
```

## 🔧 Configuration

### Secrets Management

**⚠️ IMPORTANT**: Before deploying to production, update the secrets in [k8s/base/backend-secret.yaml](base/backend-secret.yaml) and [k8s/base/postgres-secret.yaml](base/postgres-secret.yaml).

```yaml
# Example: Update backend-secret.yaml
stringData:
  ADMIN_SECRET: your-strong-admin-secret-here
  INVITE_OWNER_JWT_SECRET: your-jwt-secret-min-32-characters-long
  DATABASE_URL: postgresql://user:password@postgres:5432/everundang
```

### Environment Variables

**Development** ([overlays/development/kustomization.yaml](overlays/development/kustomization.yaml)):
- `NODE_ENV=development`
- Lower replica counts (1 per service)
- Smaller resource requests/limits

**Production** ([overlays/production/kustomization.yaml](overlays/production/kustomization.yaml)):
- `NODE_ENV=production`
- Higher replica counts (3 per service)
- Larger resource requests/limits

### Resource Limits

Adjust resource allocations in:
- **Development**: Uses base resources
- **Production**: See [overlays/production/resources-patch.yaml](overlays/production/resources-patch.yaml)

## 📊 Monitoring & Debugging

### Check Deployment Status

```powershell
# Check all resources
oc get all -n everundang
# or
kubectl get all -n everundang

# Check pods specifically
oc get pods -n everundang

# Check services
oc get svc -n everundang

# Check routes (OpenShift)
oc get routes -n everundang

# Check ingress (Kubernetes)
kubectl get ingress -n everundang
```

### View Logs

```powershell
# Backend logs
oc logs -f deployment/backend -n everundang

# Frontend logs
oc logs -f deployment/frontend -n everundang

# Database logs
oc logs -f deployment/postgres -n everundang

# All pods
oc logs -f -l app.kubernetes.io/name=everundang -n everundang
```

### Access Pods

```powershell
# Execute commands in backend pod
oc exec -it deployment/backend -n everundang -- /bin/sh

# Execute commands in database pod
oc exec -it deployment/postgres -n everundang -- psql -U everundang
```

### Port Forwarding (for local testing)

```powershell
# Forward frontend to localhost:8080
oc port-forward svc/frontend 8080:80 -n everundang

# Forward backend to localhost:4000
oc port-forward svc/backend 4000:4000 -n everundang

# Forward postgres to localhost:5432
oc port-forward svc/postgres 5432:5432 -n everundang
```

## 🌐 Accessing the Application

### OpenShift (Routes)

After deployment, get the public URLs:

```powershell
# Get frontend URL
oc get route frontend -n everundang -o jsonpath='{.spec.host}'

# Get backend URL
oc get route backend -n everundang -o jsonpath='{.spec.host}'
```

Access the application at `https://<frontend-route-host>`

### Kubernetes (Ingress)

Update the Ingress hostnames in [k8s/base/ingress.yaml](base/ingress.yaml) to match your domain:

```yaml
spec:
  rules:
  - host: everundang.yourdomain.com
  - host: api.everundang.yourdomain.com
```

Then ensure your DNS points to your ingress controller's IP.

## 🗄️ Database

### Persistence

PostgreSQL data is stored in a PersistentVolumeClaim (`postgres-pvc`) with 5Gi storage.

### Backup Database

```powershell
# Dump database
oc exec deployment/postgres -n everundang -- pg_dump -U everundang everundang > backup.sql

# Restore database
cat backup.sql | oc exec -i deployment/postgres -n everundang -- psql -U everundang everundang
```

### Access Database

```powershell
# Connect to PostgreSQL
oc exec -it deployment/postgres -n everundang -- psql -U everundang

# Run SQL queries
\dt  # List tables
SELECT * FROM invitations;
```

## 🔄 Updates & Rollouts

### Update Container Images

The deployment uses `imagePullPolicy: Always` to pull the latest images tagged as `:latest`.

```powershell
# Force rollout restart to pull new images
oc rollout restart deployment/backend -n everundang
oc rollout restart deployment/frontend -n everundang

# Check rollout status
oc rollout status deployment/backend -n everundang
```

### Scaling

**Note**: With Horizontal Pod Autoscaler (HPA) enabled, manual scaling is not recommended as HPA will override manual changes. See [HPA_GUIDE.md](HPA_GUIDE.md) for autoscaling documentation.

```powershell
# View HPA status
kubectl get hpa -n everundang

# Test autoscaling with load
.\k8s\load-test.ps1

# Manual scaling (not recommended with HPA enabled)
# oc scale deployment/backend --replicas=5 -n everundang

# Check current replicas
oc get deployment -n everundang
```

## 🔄 Horizontal Pod Autoscaler (HPA)

EverUndang uses HPA to automatically scale pods based on CPU and memory usage.

### Quick HPA Commands

```powershell
# View HPA status
kubectl get hpa -n everundang

# Watch HPA in real-time
kubectl get hpa -n everundang -w

# View pod resource usage
kubectl top pods -n everundang

# Run load test to trigger scaling
.\k8s\load-test.ps1
```

### HPA Configuration

- **Backend**: 2-10 replicas (scales at 70% CPU, 80% memory)
- **Frontend**: 2-8 replicas (scales at 75% CPU, 85% memory)

For detailed HPA documentation, see [HPA_GUIDE.md](HPA_GUIDE.md).

## 🧹 Cleanup

### Delete All Resources

```powershell
# Windows
.\k8s\delete.ps1

# Linux/Mac
./k8s/delete.sh
```

This will delete the entire `everundang` namespace and all resources within it.

## 🛠️ Troubleshooting

### Pods Not Starting

```powershell
# Describe pod to see events
oc describe pod <pod-name> -n everundang

# Check pod logs
oc logs <pod-name> -n everundang

# Check previous container logs (if crashed)
oc logs <pod-name> -n everundang --previous
```

### Image Pull Errors

If using private GitHub Container Registry images, create an image pull secret:

```powershell
oc create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<your-github-token> \
  -n everundang

# Link secret to default service account
oc secrets link default ghcr-secret --for=pull -n everundang
```

Then add to deployments:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: ghcr-secret
```

### Database Connection Issues

```powershell
# Check if postgres is running
oc get pods -n everundang -l app.kubernetes.io/component=database

# Check backend environment variables
oc exec deployment/backend -n everundang -- env | grep DATABASE

# Test database connection from backend pod
oc exec deployment/backend -n everundang -- nc -zv postgres 5432
```

### Routes Not Working (OpenShift)

```powershell
# Check route status
oc get routes -n everundang
oc describe route frontend -n everundang

# Verify service endpoints
oc get endpoints -n everundang
```

## 📚 Additional Resources

- [OpenShift Documentation](https://docs.openshift.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

## 🔐 Security Best Practices

1. **Never commit secrets to Git**: Use sealed-secrets, external secret managers, or environment-specific secret files
2. **Use RBAC**: Create service accounts with minimal required permissions
3. **Enable network policies**: Restrict pod-to-pod communication
4. **Use TLS**: Routes/Ingress should always use HTTPS (enabled by default in our config)
5. **Scan images**: Use tools like Trivy or Snyk to scan container images
6. **Keep images updated**: Regularly update base images for security patches