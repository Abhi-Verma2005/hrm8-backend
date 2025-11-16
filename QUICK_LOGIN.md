# Quick Login - Tata Motors

## Login Command

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tatamotors.com",
    "password": "TestPassword123"
  }' | jq '.'
```

## Pretty Output Version

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tatamotors.com",
    "password": "TestPassword123"
  }' | jq '.'
```

## Expected Response

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

## Test Protected Route After Login

After logging in (which saves cookie to `cookies.txt`), test a protected route:

```bash
# Replace COMPANY_ID with your actual company ID
curl -b cookies.txt -X GET http://localhost:3000/api/companies/COMPANY_ID \
  -H "Content-Type: application/json" | jq '.'
```

## Check Cookie

```bash
cat cookies.txt
```

You should see a `sessionId` cookie entry.

