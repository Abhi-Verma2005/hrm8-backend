#!/bin/bash

# Authentication Flow Test Script
# This script tests the complete session-based cookie authentication flow

BASE_URL="http://localhost:8080"
COOKIE_JAR="cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== HRM8 Authentication Flow Test ===${NC}\n"

# Clean up cookie jar
rm -f "$COOKIE_JAR"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
echo "GET $BASE_URL/health"
curl -s -X GET "$BASE_URL/health" | jq '.'
echo -e "\n"

# Test 2: Company Registration
echo -e "${YELLOW}Test 2: Company Registration${NC}"
echo "POST $BASE_URL/api/auth/register/company"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register/company" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Tata Motors",
    "companyWebsite": "https://www.tatamotors.com",
    "adminFirstName": "Admin",
    "adminLastName": "User",
    "adminEmail": "admin@tatamotors.com",
    "password": "TestPassword123",
    "countryOrRegion": "India",
    "acceptTerms": true
  }')

echo "$RESPONSE" | jq '.'

# Extract company ID and admin user ID
COMPANY_ID=$(echo "$RESPONSE" | jq -r '.data.companyId')
ADMIN_ID=$(echo "$RESPONSE" | jq -r '.data.adminUserId')

if [ "$COMPANY_ID" != "null" ] && [ "$COMPANY_ID" != "" ]; then
  echo -e "${GREEN}✓ Company registered successfully${NC}"
  echo "Company ID: $COMPANY_ID"
  echo "Admin User ID: $ADMIN_ID"
else
  echo -e "${RED}✗ Company registration failed${NC}"
  exit 1
fi
echo -e "\n"

# Wait a moment for database operations
sleep 1

# Test 3: Login (This will create a session and set cookie)
echo -e "${YELLOW}Test 3: Login${NC}"
echo "POST $BASE_URL/api/auth/login"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tatamotors.com",
    "password": "TestPassword123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Login successful${NC}"
  
  # Check if cookie was set
  if [ -f "$COOKIE_JAR" ] && grep -q "sessionId" "$COOKIE_JAR"; then
    echo -e "${GREEN}✓ Session cookie received${NC}"
    echo "Cookie content:"
    cat "$COOKIE_JAR"
  else
    echo -e "${RED}✗ No session cookie received${NC}"
  fi
else
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi
echo -e "\n"

# Test 4: Access Protected Route (Should succeed with session cookie)
echo -e "${YELLOW}Test 4: Access Protected Route (with session)${NC}"
echo "GET $BASE_URL/api/companies/$COMPANY_ID"
PROTECTED_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X GET "$BASE_URL/api/companies/$COMPANY_ID" \
  -H "Content-Type: application/json")

echo "$PROTECTED_RESPONSE" | jq '.'

if echo "$PROTECTED_RESPONSE" | jq -e '.success == true' > /dev/null 2>/dev/null; then
  echo -e "${GREEN}✓ Protected route accessible with session${NC}"
else
  echo -e "${RED}✗ Protected route failed (check if middleware is working)${NC}"
fi
echo -e "\n"

# Test 5: Access Protected Route WITHOUT cookie (Should fail)
echo -e "${YELLOW}Test 5: Access Protected Route (without session)${NC}"
echo "GET $BASE_URL/api/companies/$COMPANY_ID (no cookie)"
NO_COOKIE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/companies/$COMPANY_ID" \
  -H "Content-Type: application/json")

echo "$NO_COOKIE_RESPONSE" | jq '.'

if echo "$NO_COOKIE_RESPONSE" | jq -e '.success == false' > /dev/null 2>/dev/null; then
  echo -e "${GREEN}✓ Protected route correctly rejected without session${NC}"
else
  echo -e "${RED}✗ Protected route should have been rejected${NC}"
fi
echo -e "\n"

# Test 6: Get Verification Status (Protected route)
echo -e "${YELLOW}Test 6: Get Verification Status${NC}"
echo "GET $BASE_URL/api/companies/$COMPANY_ID/verification-status"
VERIFY_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X GET "$BASE_URL/api/companies/$COMPANY_ID/verification-status" \
  -H "Content-Type: application/json")

echo "$VERIFY_RESPONSE" | jq '.'
echo -e "\n"

# Test 7: Logout
echo -e "${YELLOW}Test 7: Logout${NC}"
echo "POST $BASE_URL/api/auth/logout"
LOGOUT_RESPONSE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/logout" \
  -H "Content-Type: application/json")

echo "$LOGOUT_RESPONSE" | jq '.'

if echo "$LOGOUT_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Logout successful${NC}"
else
  echo -e "${RED}✗ Logout failed${NC}"
fi
echo -e "\n"

# Test 8: Access Protected Route AFTER logout (Should fail)
echo -e "${YELLOW}Test 8: Access Protected Route (after logout)${NC}"
echo "GET $BASE_URL/api/companies/$COMPANY_ID (after logout)"
AFTER_LOGOUT_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X GET "$BASE_URL/api/companies/$COMPANY_ID" \
  -H "Content-Type: application/json")

echo "$AFTER_LOGOUT_RESPONSE" | jq '.'

if echo "$AFTER_LOGOUT_RESPONSE" | jq -e '.success == false' > /dev/null 2>/dev/null; then
  echo -e "${GREEN}✓ Protected route correctly rejected after logout${NC}"
else
  echo -e "${RED}✗ Protected route should have been rejected after logout${NC}"
fi
echo -e "\n"

# Test 9: Login again (Should work)
echo -e "${YELLOW}Test 9: Login Again${NC}"
echo "POST $BASE_URL/api/auth/login"
LOGIN_AGAIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tatamotors.com",
    "password": "TestPassword123"
  }')

echo "$LOGIN_AGAIN_RESPONSE" | jq '.'

if echo "$LOGIN_AGAIN_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✓ Second login successful${NC}"
else
  echo -e "${RED}✗ Second login failed${NC}"
fi
echo -e "\n"

# Clean up
rm -f "$COOKIE_JAR"

echo -e "${GREEN}=== All Tests Completed ===${NC}"

