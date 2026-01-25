# PowerShell script to configure kubectl contexts for SIT, REPLICA, and PRODUCTION clusters
# For Windows (non-admin users)

Write-Host "Configuring kubectl contexts..." -ForegroundColor Cyan
Write-Host ""

# Check if kubectl is installed
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: kubectl is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install kubectl first: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/" -ForegroundColor Yellow
    exit 1
}

# SIT Cluster Configuration
Write-Host "Configuring SIT cluster..." -ForegroundColor Green
kubectl config set-cluster sit-cluster `
  --server=https://10.167.166.26:6443 `
  --insecure-skip-tls-verify=true

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure SIT cluster" -ForegroundColor Yellow
}

kubectl config set-credentials sit-user `
  --token=eyJhbGciOiJSUzI1NiIsImtpZCI6InllSklVeWZvakQ0eGxGLVREZ3U3WlkxYjB6cVZMRS1ULTZSV2h6QUQyOTQifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJrOHMtZGFzaGJvYXJkLXJlYWQtdG9rZW4tcTZ0bTciLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiazhzLWRhc2hib2FyZC1yZWFkIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiYTRjMmIwNWQtMmMzMy00NjAzLTk3ZmEtOWQzNTRjNzg0MTlhIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmUtc3lzdGVtOms4cy1kYXNoYm9hcmQtcmVhZCJ9.CcRsXuuzMxp0XmDJoLQnE_ms3PNoIjeiBj4MGvY0FHWJ9vq3tekB-R6bovWuTEMm1AxZsvcHebr615m7dv6mk9W4HDP34qpSaXI5ZIyWTmFK_v-pcGsw1X3_pEHGeOyaX2WOPXuSf1nftZTOuK_uw_Fs7emHb1FbMuZXrGE1iUhSsgeSXFmvNadPlNoPwfo2DNMa8NQ4h0EWKdqwfeteFyYqN91y0m2sbeiCLDCMEfvfVWNyhvMpHaK_2dgOVIDK2sjSe_mF_ZfE0xAL5e1_A-nBbPhfd1ZBZ6qrzaz4x6gyhuRvgoTmMLSZBkqxCHhgK1naKMXi_LKcTpofPYHwLg

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure SIT credentials" -ForegroundColor Yellow
}

kubectl config set-context sit-cluster `
  --cluster=sit-cluster `
  --user=sit-user `
  --namespace=jio-t2r-ms

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure SIT context" -ForegroundColor Yellow
}

# REPLICA Cluster Configuration
Write-Host "Configuring REPLICA cluster..." -ForegroundColor Green
kubectl config set-cluster replica-cluster `
  --server=https://10.166.132.10:6443 `
  --insecure-skip-tls-verify=true

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure REPLICA cluster" -ForegroundColor Yellow
}

kubectl config set-credentials replica-user `
  --token=eyJhbGciOiJSUzI1NiIsImtpZCI6InBjeHVVNVZMZkRUa2R1V25fVnN1R1BVUUk4LWV2REt6Q0RjMXp0TndxelUifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJqaW8tdDJyLW1zIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6Ims4cy1kYXNoYm9hcmQtdG9rZW4tZG5ndjgiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiazhzLWRhc2hib2FyZCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6IjkxMTU4NGE3LTY3YzYtNGNlYi1hNTIxLThlNjc1MWNhMGUwOCIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpqaW8tdDJyLW1zOms4cy1kYXNoYm9hcmQifQ.RvN2x5l15WuwJfL7WKLQLikMG1pzKJvHQkn4HRcXkH2ZXZ8iV5jT5_nAwfiwwfAypJM8SI4NUPGfBkdNNEGLDszdFoyxXy0pzLSwM4-MqUxx8JoekY6vmiAqW0DvdWmRtNwUUSfclkl_gyCfUUzByNYJygH22oU-PeswJUKWKBcZi6kcXL4ip_BBrFvPA2ipNM27ZG6tZoIMqOeJN3zO8eAu84BgLnFJJCty6W_8LjgtbiFPaeOo0QeZqczMe7s1GJMSYK4CmFm-_ZmrVw1QJqLQ5Q54HhtF3D5pGAu89somFwUMQN_wOJFRpnKCSu__2Mi55xLhGvnjXz8_rd5fjA

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure REPLICA credentials" -ForegroundColor Yellow
}

kubectl config set-context replica-cluster `
  --cluster=replica-cluster `
  --user=replica-user `
  --namespace=jio-t2r-ms

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure REPLICA context" -ForegroundColor Yellow
}

# PRODUCTION Cluster Configuration
Write-Host "Configuring PRODUCTION cluster..." -ForegroundColor Green
kubectl config set-cluster prod-cluster `
  --server=https://10.166.16.95:6443 `
  --insecure-skip-tls-verify=true

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure PRODUCTION cluster" -ForegroundColor Yellow
}

kubectl config set-credentials prod-user `
  --token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ikd6QW1VeFFTaWg5WkdLczBpb0hGWGRWblZBYU1BMzhORkJGbmhjYzRqMlUifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJqaW8tdDJyLW1zIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6Ims4cy1kYXNoYm9hcmQtdG9rZW4tNm12Z2QiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiazhzLWRhc2hib2FyZCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6ImM5NmExOWRjLTE4OTQtNDM1My1hMTEyLTkyMzIxNjUwMzRiOCIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpqaW8tdDJyLW1zOms4cy1kYXNoYm9hcmQifQ.a0wA37y_ygLFLLVW5Du6qtED19rri6K29fiohAMQISKZFhW1hPmLp4sIUWR-eUv1uhOTAl6x_Or8xednaE-slRV57nEhXQmoVFJuJSVWXyNVNOpKV84TN0cgB36DOC5-jmNK9UoHKdskucDVr_tHuorlzg16PTuNJScB9knn_Y4RMVJPaLplqzIQZFpQD0R3-XAR9m-FPJi13BlYkNV2zIJwrB2QYWp6rY9gKNIKB_ojqkeEBhYIyqKhzjO8huUG7vq_hoEl2Hzs7ZdmBF-Xz9aJyTiybdU34FEIIQ4jukdZWB6LnvE8MrRTWIhPT06N5X2alMKiE8ycN9l6v40dwA

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure PRODUCTION credentials" -ForegroundColor Yellow
}

kubectl config set-context prod-cluster `
  --cluster=prod-cluster `
  --user=prod-user `
  --namespace=jio-t2r-ms

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Failed to configure PRODUCTION context" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Kubectl contexts configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Available contexts:" -ForegroundColor Cyan
kubectl config get-contexts
Write-Host ""
Write-Host "Testing contexts..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing SIT cluster..." -ForegroundColor Yellow
$sitResult = kubectl --context sit-cluster get nodes 2>&1 | Select-Object -First 3
if ($LASTEXITCODE -eq 0) {
    $sitResult | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  ⚠️  SIT cluster connection failed (may need to check API server port)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Testing REPLICA cluster..." -ForegroundColor Yellow
$replicaResult = kubectl --context replica-cluster get nodes 2>&1 | Select-Object -First 3
if ($LASTEXITCODE -eq 0) {
    $replicaResult | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  ⚠️  REPLICA cluster connection failed (may need to check API server port)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Testing PRODUCTION cluster..." -ForegroundColor Yellow
$prodResult = kubectl --context prod-cluster get nodes 2>&1 | Select-Object -First 3
if ($LASTEXITCODE -eq 0) {
    $prodResult | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  ⚠️  PRODUCTION cluster connection failed (may need to check API server port)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Note: If connections fail, the API server might be on a different port." -ForegroundColor Cyan
Write-Host "Common alternatives: 443, 6443, or check with your cluster administrator." -ForegroundColor Cyan
