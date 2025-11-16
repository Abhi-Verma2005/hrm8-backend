# Authentication Flow Test - cURL Commands

Run these commands in order to test the complete authentication flow.

## Prerequisites
- Backend server running on `http://localhost:3000`
- `jq` installed (optional, for pretty JSON output)

---

## Test 1: Health Check

```bash
curl -X GET http://localhost:3000/health
```

**Expected Response:**
```json
{"status":"ok"}
```

---

## Test 2: Company Registration

```bash
curl -X POST http://localhost:3000/api/auth/register/company \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Tata Motors",
    "companyWebsite": "https://www.tatamotors.com",
    "adminEmail": "admin@tatamotors.com",
    "adminName": "Admin User",
    "password": "TestPassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "uuid-here",
    "adminUserId": "uuid-here",
    "verificationRequired": false,
    "verificationMethod": "EMAIL_DOMAIN_CHECK",
    "message": "Company registered and verified successfully."
  }
}
```

**Save the `companyId` for later tests!**

---

## Test 3: Login (Creates Session)

**Important:** This command saves cookies to `cookies.txt` file.

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tatamotors.com",
    "password": "TestPassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "admin@tatamotors.com",
      "name": "Admin User",
      "role": "COMPANY_ADMIN",
      "companyId": "uuid-here",
      "companyName": "Tata Motors"
    }
  }
}
```

**Check cookies.txt - you should see a `sessionId` cookie!**

---

## Test 4: Access Protected Route (With Session)

**Replace `COMPANY_ID` with the actual company ID from Test 2.**

```bash
curl -b cookies.txt -X GET http://localhost:3000/api/companies/COMPANY_ID \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Tata Motors",
    "website": "https://www.tatamotors.com",
    ...
  }
}
```

**If this works, authentication middleware is working correctly!**

---

## Test 5: Access Protected Route (Without Session - Should Fail)

```bash
curl -X GET http://localhost:3000/api/companies/COMPANY_ID \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Not authenticated. Please login."
}
```

---

## Test 6: Get Verification Status (Protected Route)

```bash
curl -b cookies.txt -X GET http://localhost:3000/api/companies/COMPANY_ID/verification-status \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "VERIFIED"
  }
}
```

---

## Test 7: Logout (Destroys Session)

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Test 8: Access Protected Route After Logout (Should Fail)

```bash
curl -b cookies.txt -X GET http://localhost:3000/api/companies/COMPANY_ID \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid or expired session. Please login again."
}
```

---

## Test 9: Login with Wrong Password (Should Fail)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tatamotors.com",
    "password": "WrongPassword123"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

## Test 10: Login Again (After Logout)

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tatamotors.com",
    "password": "TestPassword123"
  }'
```

**Expected Response:** Should succeed again, creating a new session.

---

## Quick Test Script

You can also run all tests at once:

```bash
cd backend
./test-auth.sh
```

Or if you prefer step-by-step testing, use the individual commands above.

---

## Tips

1. **Cookie Management:**
   - `-c cookies.txt` = Save cookies to file
   - `-b cookies.txt` = Send cookies from file

2. **Pretty Output:**
   - Add `| jq '.'` at the end of any curl command for formatted JSON

3. **Debugging:**
   - Use `-v` flag for verbose output to see headers
   - Check `cookies.txt` file to see what cookies are being stored

4. **Replace Placeholders:**
   - Replace `COMPANY_ID` with actual UUID from registration response

