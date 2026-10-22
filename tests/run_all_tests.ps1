# Master Test Runner across all tiers
$ErrorActionPreference = "Stop"

Write-Host "=========================================================="
Write-Host "  LOGISTICS CONTROL TOWER - MASTER VERIFICATION SUITE     "
Write-Host "=========================================================="

# 1. MS1 Order Service Tests
Write-Host "[1/5] Running MS1 Order Service Unit Tests..."
Set-Location "services/order-service"
npm run test:unit
Set-Location "../.."
Write-Host "[PASS] MS1 Order Service Tests Passed"

# 2. MS2 Shipment Service Tests
Write-Host "[2/5] Running MS2 Shipment Service Unit Tests..."
Set-Location "services/shipment-service"
npm run test:unit
Set-Location "../.."
Write-Host "[PASS] MS2 Shipment Service Tests Passed"

# 3. MS3 Tracking Service Tests
Write-Host "[3/5] Running MS3 Tracking Service Tests..."
python -m pytest services/tracking-service/tests
Write-Host "[PASS] MS3 Tracking Service Tests Passed"

# 4. Frontend Build and Typecheck
Write-Host "[4/5] Running Frontend TypeScript Compilation and Build..."
Set-Location "frontend"
npm run build
Set-Location ".."
Write-Host "[PASS] Frontend Build and Typecheck Passed"

# 5. Cross-Service Contract and Sanity Tests
Write-Host "[5/5] Running Cross-Service Integration and Contract Tests..."
python tests/e2e/test_e2e_flow.py
Write-Host "[PASS] Cross-Service Integration Tests Passed"

Write-Host "=========================================================="
Write-Host "  ALL 5 TEST SUITES COMPLETED AND PASSED SUCCESSFULLY!    "
Write-Host "=========================================================="
