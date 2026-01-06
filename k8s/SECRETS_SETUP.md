# GitHub Secrets Setup Guide

This guide shows you how to configure the necessary secrets for CI/CD deployment to Kubernetes.

## 🔐 Required Secrets

### 1. KUBE_CONFIG (Production)
Base64-encoded Kubernetes configuration file for production cluster access.

### 2. KUBE_CONFIG_DEV (Development)
Base64-encoded Kubernetes configuration file for development cluster access.

## 📝 Step-by-Step Setup

### For Docker Desktop Kubernetes (Local/Dev):

#### Windows PowerShell:

```powershell
# Navigate to your .kube directory
cd $HOME\.kube

# Read and encode the config file
$kubeConfig = Get-Content config -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($kubeConfig)
$encoded = [Convert]::ToBase64String($bytes)

# Copy to clipboard
$encoded | Set-Clipboard
Write-Host "✅ Kubeconfig encoded and copied to clipboard!"

# Or save to file
$encoded | Out-File kube-config-base64.txt
Write-Host "✅ Saved to kube-config-base64.txt"
```

#### Linux/macOS:

```bash
# Encode kubeconfig
cat ~/.kube/config | base64 -w 0 > kube-config-base64.txt

# For macOS (no -w flag):
cat ~/.kube/config | base64 > kube-config-base64.txt

echo "✅ Saved to kube-config-base64.txt"
```

### For OpenShift:

```bash
# Login to OpenShift cluster
oc login <your-cluster-url>

# Create a service account for CI/CD
oc create serviceaccount github-actions -n everundang

# Grant necessary permissions
oc adm policy add-role-to-user admin system:serviceaccount:everundang:github-actions -n everundang

# Get the service account token
TOKEN=$(oc create token github-actions -n everundang --duration=87600h)

# Create kubeconfig for the service account
cat > github-actions-kubeconfig.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: $(oc whoami --show-server)
    insecure-skip-tls-verify: true
  name: openshift
contexts:
- context:
    cluster: openshift
    namespace: everundang
    user: github-actions
  name: github-actions-context
current-context: github-actions-context
users:
- name: github-actions
  user:
    token: $TOKEN
EOF

# Base64 encode it
cat github-actions-kubeconfig.yaml | base64 -w 0 > kube-config-base64.txt

echo "✅ OpenShift kubeconfig created and encoded"
```

## 🌐 Adding Secrets to GitHub

### Via GitHub Web UI:

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret:

#### For KUBE_CONFIG:
- **Name**: `KUBE_CONFIG`
- **Value**: Paste the base64 string
- Click **Add secret**

#### For KUBE_CONFIG_DEV:
- **Name**: `KUBE_CONFIG_DEV`
- **Value**: Paste the base64 string (can be same as KUBE_CONFIG for local testing)
- Click **Add secret**

### Via GitHub CLI:

```bash
# Install GitHub CLI if not already installed
# Windows: winget install GitHub.cli
# macOS: brew install gh
# Linux: See https://cli.github.com/

# Authenticate
gh auth login

# Add KUBE_CONFIG secret
gh secret set KUBE_CONFIG < kube-config-base64.txt

# Add KUBE_CONFIG_DEV secret
gh secret set KUBE_CONFIG_DEV < kube-config-base64.txt

echo "✅ Secrets added to GitHub repository"
```

## 🧪 Testing the Configuration

### Option 1: Manual Workflow Dispatch

1. Go to **Actions** tab in GitHub
2. Select **Deploy** workflow
3. Click **Run workflow**
4. Select branch (main for production)
5. Click **Run workflow**
6. Watch the deployment progress

### Option 2: Test Locally

```powershell
# Decode and test the kubeconfig
$encoded = Get-Content kube-config-base64.txt -Raw
$decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded))
$decoded | Out-File test-kubeconfig.yaml

# Test connection
$env:KUBECONFIG = "test-kubeconfig.yaml"
kubectl cluster-info
kubectl get nodes
kubectl get pods -n everundang

# Clean up
Remove-Item test-kubeconfig.yaml
```

## 🔄 Updating Secrets

If your kubeconfig changes (cluster migration, token expiry, etc.):

1. Generate new base64-encoded kubeconfig (steps above)
2. Go to GitHub repository → **Settings** → **Secrets**
3. Click on the secret name (e.g., `KUBE_CONFIG`)
4. Click **Update secret**
5. Paste new value
6. Click **Update secret**

## ⚠️ Security Best Practices

1. **Never commit kubeconfig files**
   - Already in `.gitignore`
   - Delete temporary files after encoding

2. **Use service accounts**
   - Create dedicated service accounts for CI/CD
   - Grant minimal necessary permissions
   - Don't use your personal credentials

3. **Rotate tokens regularly**
   - For OpenShift: Create new tokens every 90 days
   - Update GitHub secrets accordingly

4. **Use environment protection**
   - Enable required reviewers for production deploys
   - Add deployment branch restrictions

5. **Monitor access**
   - Review GitHub Actions logs regularly
   - Check cluster audit logs
   - Set up alerts for unauthorized access

## 🎯 Optional: Environment Protection Rules

For production deployments, add protection:

1. Go to **Settings** → **Environments**
2. Click **New environment** → name it "production"
3. Add **Required reviewers** (team members who must approve)
4. Add **Deployment branches** → select "Selected branches" → add `main`
5. Click **Save protection rules**

Update workflow to use environment:

```yaml
deploy-to-kubernetes:
  environment:
    name: production
    url: https://everundang.example.com
```

## ✅ Verification Checklist

- [ ] Kubeconfig successfully encoded to base64
- [ ] KUBE_CONFIG secret added to GitHub
- [ ] KUBE_CONFIG_DEV secret added to GitHub
- [ ] Test workflow runs without authentication errors
- [ ] kubectl commands work in CI/CD
- [ ] Deployments successfully applied to cluster
- [ ] Pods restart and pull new images
- [ ] No sensitive data committed to Git

## 🆘 Troubleshooting

### Error: "Unable to connect to cluster"

**Cause:** Invalid or expired kubeconfig

**Solution:**
1. Verify kubeconfig works locally
2. Check base64 encoding is correct
3. Ensure no extra whitespace in secret
4. For OpenShift, regenerate service account token

### Error: "Forbidden: User cannot access namespace"

**Cause:** Insufficient permissions

**Solution:**
1. Grant necessary RBAC permissions
2. For OpenShift: `oc adm policy add-role-to-user admin <user> -n everundang`
3. For Kubernetes: Apply role binding YAML

### Error: "Deployment not found"

**Cause:** Wrong namespace or cluster

**Solution:**
1. Verify namespace exists: `kubectl get namespaces`
2. Check if using correct context
3. Run: `kubectl apply -f k8s/base/namespace.yaml` first

## 📚 Additional Resources

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [OpenShift Service Accounts](https://docs.openshift.com/container-platform/latest/authentication/using-service-accounts-in-applications.html)

---

**Ready to deploy?** Once secrets are configured, any push to `main` branch will trigger automatic deployment! 🚀
