#!/bin/bash

# Test Runner Helper Script
# Makes it easy to run database queries and API tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 HRM8 Test Runner${NC}\n"

# Check if we're in the backend directory
if [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo -e "${YELLOW}⚠️  Warning: Not in backend directory. Changing to backend directory...${NC}"
  cd "$BACKEND_DIR"
fi

# Function to run DB query
run_db_query() {
  echo -e "${GREEN}📊 Running Database Query...${NC}\n"
  npx ts-node "$SCRIPT_DIR/db-query-template.ts"
}

# Function to run curl test
run_curl_test() {
  if [ -z "$1" ]; then
    echo -e "${YELLOW}❌ Error: Cookie string is required for curl tests${NC}"
    echo -e "\nUsage:"
    echo -e "  ./test-scripts/run-test.sh curl \"<cookie-string>\""
    echo -e "\nExample:"
    echo -e "  ./test-scripts/run-test.sh curl \"sessionId=abc123; hrm8SessionId=xyz789\""
    echo -e "\n💡 Tip: Copy the cookie string from the Developer Tools section in your profile page (development mode only)"
    exit 1
  fi
  
  echo -e "${GREEN}📡 Running API Test with Curl...${NC}\n"
  npx ts-node "$SCRIPT_DIR/curl-test-template.ts" "$1"
}

# Function to show help
show_help() {
  echo "Usage: ./test-scripts/run-test.sh [command] [options]"
  echo ""
  echo "Commands:"
  echo "  db              Run database query test"
  echo "  curl <cookies>  Run API test with curl (requires cookie string)"
  echo "  help            Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./test-scripts/run-test.sh db"
  echo "  ./test-scripts/run-test.sh curl \"sessionId=abc123; hrm8SessionId=xyz789\""
  echo ""
  echo "💡 Tip: Get cookie string from Developer Tools in profile page (development mode only)"
}

# Main command handler
case "$1" in
  db)
    run_db_query
    ;;
  curl)
    run_curl_test "$2"
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo -e "${YELLOW}Unknown command: $1${NC}\n"
    show_help
    exit 1
    ;;
esac














