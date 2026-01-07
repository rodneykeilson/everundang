# CI/CD Pipeline Guide for Kubernetes Deployment

This guide explains how EverUndang's CI/CD pipeline automatically builds, tests, and deploys to Kubernetes/OpenShift.

## 📋 Overview

EverUndang uses **GitHub Actions** for continuous integration and deployment with the following workflows:

1. **CI Workflow** (`ci.yml`) - Runs on every push and PR
2. **Production Deploy** (`deploy.yml`) - Deploys to production on main branch
3. **Development Deploy** (`deploy-dev.yml`) - Deploys to dev on develop branch

## 🔄 Workflow Architecture

```
┌─────────────────┐
│  Code Push/PR   │
└────────┬────────┘
         │
         ├───────────────────────────────┐
         │                               │
         ▼                               ▼
┌────────────────┐            ┌──────────────────┐
│   CI Workflow  │            │  Deploy Workflow │
│   (ci.yml)     │            │  (deploy.yml)    │
├────────────────┤            ├──────────────────┤
│ • Build code   │            │ • Build images   │
│ • Run tests    │            │ • Push to GHCR   │
│ • Validate     │            │ • Deploy to K8s  │
└────────────────┘            │ • Verify health  │
                              └──────────────────┘
```

## 🚀 Workflows Explained

### 1. CI Workflow (ci.yml)

**Triggers:**
- Push to `main` branch
- Pull requests to any branch

**Jobs:**
1. **Backend Build**
   - Installs dependencies
   - Builds TypeScript code
   - Validates compilation

2. **Frontend Build**
   - Installs dependencies
   - Builds React app
   - Validates Vite build

**Purpose:** Fast feedback on code quality before merge

### 2. Production Deploy (deploy.yml)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

**Jobs:**

#### Job 1: Build & Push Images
1. Checkout code
2. Set up Docker Buildx
3. Login to GitHub Container Registry
4. Build backend Docker image
5. Build frontend Docker image
6. Push images with tags: `latest` and `sha-<commit>`

#### Job 2: Deploy to Kubernetes
1. Configure kubectl with kubeconfig secret
2. Verify cluster connection
3. Apply Kustomize overlays (production)
4. Restart deployments to pull new images
5. Wait for rollout completion
6. Verify deployment health

### 3. Development Deploy (deploy-dev.yml)

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Similar to production but:**
- Uses `dev-latest` image tags
- Deploys to development namespace/environment
- Uses development Kustomize overlay
- Faster rollout with `cancel-in-progress: true`

## 🔐 Required GitHub Secrets

### Repository Secrets

Configure these in: **Settings → Secrets and variables → Actions**

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `KUBE_CONFIG` | Base64-encoded kubeconfig for production cluster | Production deploy |
| `KUBE_CONFIG_DEV` | Base64-encoded kubeconfig for dev cluster | Dev deploy |
| `FRONTEND_API_URL` | Production API URL (optional) | Frontend build |
| `DEV_FRONTEND_API_URL` | Development API URL (optional) | Dev frontend |

### How to Create KUBE_CONFIG Secret

#### For Docker Desktop Kubernetes:

```powershell
# Get your kubeconfig
$kubeConfig = Get-Content $HOME\.kube\config -Raw

# Base64 encode it
$bytes = [System.Text.Encoding]::UTF8.GetBytes($kubeConfig)
$encoded = [Convert]::ToBase64String($bytes)

# Copy to clipboard
$encoded | Set-Clipboard

# Or save to file
$encoded | Out-File kube-config-base64.txt
```

Then add it as a secret in GitHub:
1. Go to **Repository → Settings → Secrets → Actions**
2. Click **New repository secret**
3. Name: `KUBE_CONFIG`
4. Value: Paste the base64 string
5. Click **Add secret**

#### For OpenShift:

```bash
# Login to OpenShift
oc login <your-cluster-url>

# Get token-based kubeconfig
oc config view --minify --flatten > kube-config.yaml

# Base64 encode
cat kube-config.yaml | base64 -w 0 > kube-config-base64.txt

# Copy content and add as GitHub secret
```

## 📊 Deployment Process

### What Happens During Deployment:

1. **Image Build** (2-5 minutes)
   - Backend and frontend built in parallel
   - Multi-stage Docker builds for optimization
   - Images pushed to `ghcr.io/rodneykeilson/everundang-*`

2. **Kubernetes Deployment** (2-3 minutes)
   - Kustomize applies environment-specific configs
   - Deployments restart to pull latest images
   - Rolling update ensures zero downtime
   - Health checks verify pod readiness

3. **Verification** (1 minute)
   - Wait for rollout completion
   - Check deployment status
   - Verify HPA configuration
   - Test service endpoints

**Total Time:** ~5-10 minutes from push to live

## 🔍 Monitoring Deployments

### GitHub Actions UI

1. Go to **Actions** tab in repository
2. Click on the running workflow
3. Expand job steps to see logs
4. View deployment summary in job output

### Kubernetes Cluster

```powershell
# Watch deployment progress
kubectl rollout status deployment/backend -n everundang -w

# Check pod status
kubectl get pods -n everundang -w

# View deployment events
kubectl get events -n everundang --sort-by='.lastTimestamp'

# Check HPA during deployment
kubectl get hpa -n everundang -w
```

## 🎯 Deployment Strategies

### Current Strategy: Rolling Update

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Create 1 extra pod during update
    maxUnavailable: 0  # Keep all pods available
```

**Benefits:**
- Zero downtime deployments
- Gradual traffic shift
- Easy rollback
- Works well with HPA

### Rollback Procedure

```powershell
# Rollback to previous version
kubectl rollout undo deployment/backend -n everundang
kubectl rollout undo deployment/frontend -n everundang

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n everundang

# Check rollout history
kubectl rollout history deployment/backend -n everundang
```

## 🐛 Troubleshooting

### Deployment Fails

**Check workflow logs:**
1. Go to Actions tab
2. Click failed workflow
3. Expand failed step
4. Look for error messages

**Common Issues:**

#### 1. KUBE_CONFIG secret invalid
```
Error: Unable to connect to cluster
```
**Solution:** Regenerate and update KUBE_CONFIG secret

#### 2. Image pull errors
```
Error: ErrImagePull
```
**Solution:** Check GHCR authentication, ensure images were pushed

#### 3. Timeout waiting for rollout
```
Error: Timeout exceeded waiting for deployment
```
**Solution:** Check pod logs, resource limits, or health checks

### Manual Intervention

```powershell
# Force delete stuck pods
kubectl delete pod <pod-name> -n everundang --force

# Restart deployment
kubectl rollout restart deployment/backend -n everundang

# Scale down and up
kubectl scale deployment/backend --replicas=0 -n everundang
kubectl scale deployment/backend --replicas=2 -n everundang
```

## 🔒 Security Best Practices

1. **Secrets Management**
   - Never commit kubeconfig to Git
   - Rotate secrets regularly
   - Use environment-specific secrets
   - Consider using GitHub Environments for approval gates

2. **Image Security**
   - Scan images for vulnerabilities
   - Use minimal base images
   - Keep dependencies updated
   - Sign images with cosign (optional)

3. **Access Control**
   - Use service accounts with minimal permissions
   - Enable RBAC in cluster
   - Audit GitHub Actions logs
   - Restrict who can trigger workflows

## 📈 Performance Optimization

### Build Optimization

```yaml
# Use build caching
cache-from: type=gha
cache-to: type=gha,mode=max

# Multi-platform builds (if needed)
platforms: linux/amd64,linux/arm64
```

### Deployment Optimization

```yaml
# Parallel deployment
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 2  # Increase for faster rollout
```

## 🎨 Customizing Workflows

### Add Test Stage

```yaml
- name: Run tests
  run: npm test
  working-directory: backend
```

### Add Slack Notifications

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}"
      }
```

### Add Deployment Approval

```yaml
deploy-to-production:
  environment:
    name: production
    url: https://everundang.example.com
  # Requires approval in GitHub Environments
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Kubernetes Deployment Docs](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kustomize Documentation](https://kustomize.io/)
- [Docker Build Cache](https://docs.docker.com/build/cache/)

## ✅ Verification Checklist

- [ ] CI workflow runs on pull requests
- [ ] Build and push workflow creates Docker images
- [ ] KUBE_CONFIG secret is properly configured
- [ ] Deploy workflow successfully applies Kustomize
- [ ] Pods restart and pull new images
- [ ] Rollout completes without errors
- [ ] HPA continues to function after deployment
- [ ] Application is accessible after deployment
- [ ] Rollback works if needed

## 🔄 Workflow Files

- Production: [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)
- Development: [.github/workflows/deploy-dev.yml](../../.github/workflows/deploy-dev.yml)
- CI: [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

---

**Next Step:** Implement monitoring with Prometheus and Grafana (Step 4) to track deployment metrics and application health.
