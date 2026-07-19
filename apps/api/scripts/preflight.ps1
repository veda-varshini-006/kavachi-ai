$API_URL="http://localhost:8000/api/v1"
$WEB_URL="http://localhost:3000"
$GRAFANA_URL="http://localhost:3001"
$PROMETHEUS_URL="http://localhost:9090"

Write-Host "Running Kavach AI Pre-flight Readiness Check..." -ForegroundColor Cyan

# 1. Check API Health
Write-Host "Checking API Health..."
try {
    $res = Invoke-WebRequest -Uri "$API_URL/health" -Method Get -ErrorAction Stop
    if ($res.StatusCode -eq 200) {
        Write-Host "[OK] API is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] API is not responding" -ForegroundColor Red
}

# 2. Check Web Dashboard
Write-Host "Checking Web Dashboard..."
try {
    $res = Invoke-WebRequest -Uri $WEB_URL -Method Get -ErrorAction Stop
    Write-Host "[OK] Web dashboard is responding" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Web dashboard is not responding" -ForegroundColor Red
}

# 3. Check Prometheus
Write-Host "Checking Prometheus..."
try {
    $res = Invoke-WebRequest -Uri "$PROMETHEUS_URL/-/healthy" -Method Get -ErrorAction Stop
    Write-Host "[OK] Prometheus is running" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Prometheus is not responding" -ForegroundColor Red
}

# 4. Check Grafana
Write-Host "Checking Grafana..."
try {
    $res = Invoke-WebRequest -Uri "$GRAFANA_URL/api/health" -Method Get -ErrorAction Stop
    Write-Host "[OK] Grafana is running" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Grafana is not responding" -ForegroundColor Red
}

Write-Host "Pre-flight checks complete!" -ForegroundColor Cyan
