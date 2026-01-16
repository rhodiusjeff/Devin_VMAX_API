# VMAX API Testing Guide with curl Commands

This guide provides curl command examples for testing all VMAX API endpoints. Make sure the server is running before executing these commands.

## Prerequisites

1. Start the database:
```bash
docker-compose up -d
```

2. Start the API server:
```bash
npm run dev
```

3. Seed the database (optional, for test data):
```bash
npm run seed
```

## Test Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@vmax.com | Password123! |
| FLEET_MGR | manager@paintballparadise.com | Password123! |
| FLEET_USER | staff@paintballparadise.com | Password123! |
| REG_OWNER | owner@example.com | Password123! |

## Authentication Endpoints

### Login
```bash
# Login as admin
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vmax.com",
    "password": "Password123!"
  }' | jq

# Save the access token for subsequent requests
export ACCESS_TOKEN="<paste-access-token-here>"
export REFRESH_TOKEN="<paste-refresh-token-here>"
```

### Register New User
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "firstName": "New",
    "lastName": "User",
    "phoneNumber": "+15551234567"
  }' | jq
```

### Refresh Tokens
```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }" | jq
```

### Logout
```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }" | jq
```

### Forgot Password
```bash
curl -X POST http://localhost:8080/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vmax.com"
  }' | jq
```

### Change Password
```bash
curl -X POST http://localhost:8080/api/v1/auth/change-password \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Password123!",
    "newPassword": "NewPassword456!"
  }' | jq
```

## User Endpoints

### Get Current User (Me)
```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Update Current User Profile
```bash
curl -X PUT http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name",
    "phoneNumber": "+15559999999"
  }' | jq
```

### List All Users (Admin only)
```bash
curl -X GET "http://localhost:8080/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get User by ID
```bash
export USER_ID="<user-uuid>"
curl -X GET "http://localhost:8080/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Create User (Admin only)
```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newfleetuser@example.com",
    "password": "SecurePass123!",
    "role": "FLEET_USER",
    "fleetId": "<fleet-uuid>",
    "firstName": "Fleet",
    "lastName": "User"
  }' | jq
```

### Update User
```bash
curl -X PUT "http://localhost:8080/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "isActive": true
  }' | jq
```

### Delete User
```bash
curl -X DELETE "http://localhost:8080/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Fleet Endpoints

### List All Fleets
```bash
curl -X GET "http://localhost:8080/api/v1/fleets?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get Fleet by ID
```bash
export FLEET_ID="<fleet-uuid>"
curl -X GET "http://localhost:8080/api/v1/fleets/$FLEET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Create Fleet (Admin only)
```bash
curl -X POST http://localhost:8080/api/v1/fleets \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseeName": "New Paintball Arena",
    "address1": "789 Sports Lane",
    "city": "Houston",
    "state": "TX",
    "postalCode": "77001",
    "country": "USA",
    "phoneNumber": "+17135551234",
    "leaseStartDate": "2026-01-01",
    "leaseEndDate": "2027-12-31"
  }' | jq
```

### Update Fleet
```bash
curl -X PUT "http://localhost:8080/api/v1/fleets/$FLEET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseeName": "Updated Arena Name",
    "phoneNumber": "+17135559999"
  }' | jq
```

### Delete Fleet
```bash
curl -X DELETE "http://localhost:8080/api/v1/fleets/$FLEET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Get Fleet Users
```bash
curl -X GET "http://localhost:8080/api/v1/fleets/$FLEET_ID/users?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get Fleet Regulators
```bash
curl -X GET "http://localhost:8080/api/v1/fleets/$FLEET_ID/regulators?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get Fleet Active Rentals
```bash
curl -X GET "http://localhost:8080/api/v1/fleets/$FLEET_ID/rentals/active" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get Fleet Rental History
```bash
curl -X GET "http://localhost:8080/api/v1/fleets/$FLEET_ID/rentals/history?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

## Regulator Endpoints

### List All Regulators
```bash
curl -X GET "http://localhost:8080/api/v1/regulators?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get My Devices
```bash
curl -X GET http://localhost:8080/api/v1/regulators/my-devices \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get Regulator by ID
```bash
export REGULATOR_ID="<regulator-uuid>"
curl -X GET "http://localhost:8080/api/v1/regulators/$REGULATOR_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Create Regulator (Admin only)
```bash
curl -X POST http://localhost:8080/api/v1/regulators \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "barcode": "VMAX-NEW-0001",
    "status": "WAREHOUSE",
    "firmwareVersion": "2.1.0",
    "hardwareRevision": "R3"
  }' | jq
```

### Update Regulator
```bash
curl -X PUT "http://localhost:8080/api/v1/regulators/$REGULATOR_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "READY",
    "firmwareVersion": "2.2.0"
  }' | jq
```

### Delete Regulator
```bash
curl -X DELETE "http://localhost:8080/api/v1/regulators/$REGULATOR_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Assign Regulator to Fleet
```bash
curl -X POST "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/assign-fleet" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"fleetId\": \"$FLEET_ID\"
  }" | jq
```

### Remove Regulator from Fleet
```bash
curl -X POST "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/remove-fleet" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

## Check-Out / Check-In Endpoints

### Check Out Regulator
```bash
curl -X POST "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/checkout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "PLAYER-001",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+15551234567",
    "emailAddress": "john.doe@example.com",
    "accessories": {
      "hopper": true,
      "tank": true,
      "mask": false,
      "pod_pack": true
    }
  }' | jq

# Save the rental ID for check-in
export RENTAL_ID="<rental-uuid-from-response>"
```

### Check In Regulator
```bash
curl -X POST "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/checkin" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"rentalId\": \"$RENTAL_ID\",
    \"accessories\": {
      \"hopper\": true,
      \"tank\": true,
      \"mask\": false,
      \"pod_pack\": true
    },
    \"notes\": \"Returned in good condition\",
    \"status\": \"CHARGING\"
  }" | jq
```

## Telemetry Endpoints

### Upload Single Telemetry Record
```bash
curl -X POST "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/telemetry" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-01-16T12:00:00.000Z",
    "soc": 85,
    "soh": 95,
    "cycles": 150,
    "voltage_mV": 12400,
    "current_mA": -500,
    "remainingCapacity_mAh": 4250,
    "fullCapacity_mAh": 5000,
    "temperature_C": 28.5,
    "fanSpeed": 5
  }' | jq
```

### Upload Telemetry Batch
```bash
curl -X POST "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/telemetry" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "telemetryBatch": [
      {
        "timestamp": "2026-01-16T12:00:00.000Z",
        "soc": 85,
        "soh": 95,
        "cycles": 150
      },
      {
        "timestamp": "2026-01-16T12:05:00.000Z",
        "soc": 84,
        "soh": 95,
        "cycles": 150
      },
      {
        "timestamp": "2026-01-16T12:10:00.000Z",
        "soc": 83,
        "soh": 95,
        "cycles": 150
      }
    ]
  }' | jq
```

### Get Telemetry History
```bash
curl -X GET "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/telemetry?page=1&limit=100" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get Telemetry with Date Filter
```bash
curl -X GET "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/telemetry?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Get Latest Telemetry
```bash
curl -X GET "http://localhost:8080/api/v1/regulators/$REGULATOR_ID/telemetry/latest" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

## Health Check

```bash
curl -X GET http://localhost:8080/api/v1/health | jq
```

## Complete Test Workflow

Here's a complete workflow to test the main features:

```bash
#!/bin/bash
set -e

BASE_URL="http://localhost:8080/api/v1"

echo "=== 1. Login as Admin ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@vmax.com", "password": "Password123!"}')
echo $LOGIN_RESPONSE | jq

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
echo "Access Token: ${ACCESS_TOKEN:0:50}..."

echo -e "\n=== 2. Get Current User ==="
curl -s -X GET "$BASE_URL/users/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo -e "\n=== 3. List Fleets ==="
FLEETS_RESPONSE=$(curl -s -X GET "$BASE_URL/fleets" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo $FLEETS_RESPONSE | jq

FLEET_ID=$(echo $FLEETS_RESPONSE | jq -r '.data.fleets[0].id')
echo "First Fleet ID: $FLEET_ID"

echo -e "\n=== 4. Get Fleet Details ==="
curl -s -X GET "$BASE_URL/fleets/$FLEET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo -e "\n=== 5. List Fleet Regulators ==="
REGULATORS_RESPONSE=$(curl -s -X GET "$BASE_URL/fleets/$FLEET_ID/regulators" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo $REGULATORS_RESPONSE | jq

REGULATOR_ID=$(echo $REGULATORS_RESPONSE | jq -r '.data.regulators[0].id')
echo "First Regulator ID: $REGULATOR_ID"

echo -e "\n=== 6. Check Out Regulator ==="
CHECKOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/regulators/$REGULATOR_ID/checkout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "TEST-001",
    "firstName": "Test",
    "lastName": "Player",
    "accessories": {"hopper": true, "tank": true}
  }')
echo $CHECKOUT_RESPONSE | jq

RENTAL_ID=$(echo $CHECKOUT_RESPONSE | jq -r '.data.rentalId')
echo "Rental ID: $RENTAL_ID"

echo -e "\n=== 7. Get Active Rentals ==="
curl -s -X GET "$BASE_URL/fleets/$FLEET_ID/rentals/active" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo -e "\n=== 8. Upload Telemetry ==="
curl -s -X POST "$BASE_URL/regulators/$REGULATOR_ID/telemetry" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "soc": 75,
    "soh": 95,
    "cycles": 150
  }' | jq

echo -e "\n=== 9. Get Latest Telemetry ==="
curl -s -X GET "$BASE_URL/regulators/$REGULATOR_ID/telemetry/latest" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo -e "\n=== 10. Check In Regulator ==="
curl -s -X POST "$BASE_URL/regulators/$REGULATOR_ID/checkin" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"rentalId\": \"$RENTAL_ID\",
    \"accessories\": {\"hopper\": true, \"tank\": true},
    \"notes\": \"Test complete\",
    \"status\": \"CHARGING\"
  }" | jq

echo -e "\n=== 11. Get Rental History ==="
curl -s -X GET "$BASE_URL/fleets/$FLEET_ID/rentals/history" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo -e "\n=== Test Complete ==="
```

Save this as `test-workflow.sh` and run with:
```bash
chmod +x test-workflow.sh
./test-workflow.sh
```

## Error Response Examples

### 401 Unauthorized (Missing Token)
```bash
curl -X GET http://localhost:8080/api/v1/users/me | jq
```
Response:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden (Insufficient Permissions)
```bash
# Login as FLEET_USER and try to create a fleet
curl -X POST http://localhost:8080/api/v1/fleets \
  -H "Authorization: Bearer $FLEET_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"licenseeName": "Test"}' | jq
```
Response:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```bash
curl -X GET http://localhost:8080/api/v1/users/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```
Response:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

### 422 Validation Error
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "password": ""}' | jq
```
Response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {"field": "email", "message": "Invalid email format"},
      {"field": "password", "message": "Password is required"}
    ]
  }
}
```
