/**
 * Reusable Curl Test Template
 * 
 * This file can be edited to test backend API endpoints with authentication.
 * 
 * Usage Options:
 * 
 * 1. Command-line arguments (recommended):
 *    npx ts-node test-scripts/curl-test-template.ts \
 *      --cookie "<cookie-string>" \
 *      --endpoint "/api/auth/me" \
 *      --method GET
 * 
 * 2. With request body:
 *    npx ts-node test-scripts/curl-test-template.ts \
 *      --cookie "<cookie-string>" \
 *      --endpoint "/api/jobs" \
 *      --method POST \
 *      --body '{"title":"Test Job","description":"Test"}'
 * 
 * 3. With custom headers:
 *    npx ts-node test-scripts/curl-test-template.ts \
 *      --cookie "<cookie-string>" \
 *      --endpoint "/api/jobs" \
 *      --method GET \
 *      --header "X-Custom-Header: value"
 * 
 * 4. Edit the runTest() function below for multiple requests
 */

import { execSync } from 'child_process';

// Parse command-line arguments
interface CliArgs {
  cookie?: string;
  endpoint?: string;
  method?: string;
  body?: string;
  headers?: string[];
  baseUrl?: string;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--cookie' || arg === '-c') {
      args.cookie = argv[++i];
    } else if (arg === '--endpoint' || arg === '-e') {
      args.endpoint = argv[++i];
    } else if (arg === '--method' || arg === '-m') {
      args.method = argv[++i];
    } else if (arg === '--body' || arg === '-b') {
      args.body = argv[++i];
    } else if (arg === '--header' || arg === '-H') {
      if (!args.headers) args.headers = [];
      args.headers.push(argv[++i]);
    } else if (arg === '--base-url' || arg === '-u') {
      args.baseUrl = argv[++i];
    } else if (!arg.startsWith('-') && !args.cookie) {
      // First positional argument is cookie (backward compatibility)
      args.cookie = arg;
    }
  }
  
  return args;
}

function showHelp() {
  console.log(`
🧪 Curl Test Script - Backend API Testing Tool

Usage:
  npx ts-node test-scripts/curl-test-template.ts [options]

Options:
  -c, --cookie <string>        Session cookie string (required)
  -e, --endpoint <path>         API endpoint path (e.g., /api/auth/me)
  -m, --method <method>         HTTP method (GET, POST, PUT, DELETE, PATCH) [default: GET]
  -b, --body <json>             Request body as JSON string
  -H, --header <header>         Custom header (can be used multiple times)
                                Format: "Header-Name: value"
  -u, --base-url <url>          Override API base URL [default: http://localhost:3000]
  -h, --help                    Show this help message

Environment Variables:
  API_BASE_URL                  Default API base URL (overridden by --base-url)

Examples:
  # Simple GET request
  npx ts-node test-scripts/curl-test-template.ts \\
    --cookie "sessionId=abc123" \\
    --endpoint "/api/auth/me"

  # POST request with body
  npx ts-node test-scripts/curl-test-template.ts \\
    --cookie "sessionId=abc123" \\
    --endpoint "/api/jobs" \\
    --method POST \\
    --body '{"title":"Test Job","description":"Test"}'

  # With custom headers
  npx ts-node test-scripts/curl-test-template.ts \\
    --cookie "sessionId=abc123" \\
    --endpoint "/api/jobs" \\
    --header "X-Request-ID: 12345" \\
    --header "X-Client-Version: 1.0"

  # Backward compatibility (cookie as first positional arg)
  npx ts-node test-scripts/curl-test-template.ts "sessionId=abc123"

💡 Tip: Copy cookie string from Developer Tools in profile page (development mode only)
`);
}

const cliArgs = parseArgs();

if (cliArgs.help) {
  showHelp();
  process.exit(0);
}

// Get cookie string
const cookieString = cliArgs.cookie;

if (!cookieString) {
  console.error('❌ Error: Cookie string is required');
  console.error('\nUse --help for usage information');
  console.error('\nQuick example:');
  console.error('  npx ts-node test-scripts/curl-test-template.ts --cookie "<cookie-string>" --endpoint "/api/auth/me"');
  process.exit(1);
}

// Backend API base URL
const API_BASE_URL = cliArgs.baseUrl || process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Execute a curl command with proper cookie handling
 */
function executeCurl(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  options: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): void {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Build curl command
  let curlCmd = `curl -X ${method} "${url}"`;
  
  // Add cookies (cookieString is guaranteed to be defined)
  curlCmd += ` -H "Cookie: ${cookieString!}"`;
  
  // Add content-type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method) && options.body) {
    curlCmd += ` -H "Content-Type: application/json"`;
  }
  
  // Add custom headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      curlCmd += ` -H "${key}: ${value}"`;
    });
  }
  
  // Add body for POST/PUT/PATCH
  if (options.body) {
    curlCmd += ` -d '${JSON.stringify(options.body)}'`;
  }
  
  // Add verbose output and show response
  curlCmd += ` -v -w "\n\nHTTP Status: %{http_code}\n"`;
  
  console.log('\n' + '═'.repeat(70));
  console.log(`📡 ${method} ${endpoint}`);
  console.log('─'.repeat(70));
  console.log(`URL: ${url}`);
  console.log(`Cookies: ${cookieString}`);
  console.log('─'.repeat(70));
  console.log('\nExecuting curl command...\n');
  
  try {
    execSync(curlCmd, { 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    
    console.log('\n✅ Request completed successfully');
  } catch (error) {
    console.error('\n❌ Request failed');
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

async function runTest() {
  try {
    // cookieString is guaranteed to be defined here due to check above
    const cookies = cookieString!;
    
    console.log('\n🧪 Running Backend API Test...\n');
    console.log('═'.repeat(70));
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log(`Cookies: ${cookies.substring(0, 50)}...`);
    console.log('═'.repeat(70));

    // If endpoint is provided via CLI, use it
    if (cliArgs.endpoint) {
      const method = (cliArgs.method || 'GET').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      
      // Parse body if provided
      let body: Record<string, unknown> | undefined;
      if (cliArgs.body) {
        try {
          body = JSON.parse(cliArgs.body);
        } catch (e) {
          console.error('❌ Error: Invalid JSON in --body argument');
          console.error('Body:', cliArgs.body);
          process.exit(1);
        }
      }
      
      // Parse headers if provided
      const headers: Record<string, string> = {};
      if (cliArgs.headers) {
        cliArgs.headers.forEach(headerStr => {
          const [key, ...valueParts] = headerStr.split(':');
          if (key && valueParts.length > 0) {
            headers[key.trim()] = valueParts.join(':').trim();
          }
        });
      }
      
      executeCurl(method, cliArgs.endpoint, { body, headers });
    } else {
      // ============================================
      // EDIT THIS SECTION TO CUSTOMIZE YOUR TEST
      // Use this when you want to run multiple requests
      // ============================================
      
      // Example 1: GET request - Get current user profile
      executeCurl('GET', '/api/auth/me');
      
      // Example 2: GET request - Get jobs (if authenticated as company user)
      // executeCurl('GET', '/api/jobs');
      
      // Example 3: POST request - Create a job (example)
      // executeCurl('POST', '/api/jobs', {
      //   body: {
      //     title: 'Test Job',
      //     description: 'This is a test job',
      //     // ... other fields
      //   }
      // });
      
      // Example 4: GET request with query parameters
      // executeCurl('GET', '/api/jobs?status=ACTIVE&limit=10');
      
      // ============================================
      // END OF CUSTOMIZABLE SECTION
      // ============================================
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ All tests complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
runTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
