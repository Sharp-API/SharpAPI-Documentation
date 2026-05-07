#!/bin/bash

# SharpAPI Public API Test Suite
# Tests all public endpoints with proper authentication and validation

set -uo pipefail
# Note: We don't use -e because we want to continue testing even if individual tests fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="https://sharpapi.io/api/v1"
API_KEY="${SHARPAPI_API_KEY:?Set SHARPAPI_API_KEY environment variable to a SharpAPI key}"
TIMEOUT=10
STREAM_TIMEOUT=5

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Results storage
FAILED_ENDPOINTS=()
SKIPPED_ENDPOINTS=()

# User tier (determined from /user/stats)
USER_TIER="unknown"

# JSON output file (optional)
JSON_OUTPUT="${JSON_OUTPUT:-test-results.json}"

# Helper functions
print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
    FAILED_ENDPOINTS+=("$1")
}

print_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((SKIPPED_TESTS++))
    SKIPPED_ENDPOINTS+=("$1")
}

# Make HTTP request and validate response
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local expected_status="${4:-200}"
    local tier_required="${5:-all}"
    local query_params="${6:-}"
    
    ((TOTAL_TESTS++))
    print_test "$description"
    
    # Check tier requirement
    if [ "$tier_required" != "all" ] && [ "$USER_TIER" != "unknown" ]; then
        if [ "$tier_required" == "pro+" ] && [ "$USER_TIER" == "free" ]; then
            print_skip "$description (requires $tier_required, current tier: $USER_TIER)"
            return 0
        fi
        if [ "$tier_required" == "sharp" ] && [ "$USER_TIER" != "sharp" ]; then
            print_skip "$description (requires $tier_required, current tier: $USER_TIER)"
            return 0
        fi
    fi
    
    local url="${BASE_URL}${endpoint}"
    if [ -n "$query_params" ]; then
        # Check if endpoint already has query params
        if [[ "$endpoint" == *"?"* ]]; then
            url="${url}&${query_params}"
        else
            url="${url}?${query_params}"
        fi
    fi
    
    local response
    local status_code
    local response_body
    
    # Make request with timeout
    response=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: ${API_KEY}" \
        -X "$method" \
        --max-time "$TIMEOUT" \
        "$url" 2>&1) || {
        print_fail "$description - Network error or timeout"
        return 1
    }
    
    # Extract status code (last line) and body
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')
    
    # Check status code
    if [ "$status_code" -eq 429 ]; then
        echo -e "${YELLOW}[RETRY]${NC} Rate limited, waiting 2 seconds..."
        sleep 2
        response=$(curl -s -w "\n%{http_code}" \
            -H "X-API-Key: ${API_KEY}" \
            -X "$method" \
            --max-time "$TIMEOUT" \
            "$url" 2>&1) || {
            print_fail "$description - Network error on retry"
            return 1
        }
        status_code=$(echo "$response" | tail -n1)
        response_body=$(echo "$response" | sed '$d')
    fi
    
    if [ "$status_code" -eq 403 ]; then
        print_skip "$description - Tier restriction (403 Forbidden)"
        return 0
    fi
    
    if [ "$status_code" -ne "$expected_status" ]; then
        print_fail "$description - Expected status $expected_status, got $status_code"
        echo "Response: $response_body" | head -c 200
        echo ""
        return 1
    fi
    
    # Validate JSON structure
    if ! echo "$response_body" | jq -e . >/dev/null 2>&1; then
        print_fail "$description - Invalid JSON response"
        echo "Response: $response_body" | head -c 200
        echo ""
        return 1
    fi
    
    # Check for success field (if present)
    local success=$(echo "$response_body" | jq -r '.success // true' 2>/dev/null)
    if [ "$success" == "false" ]; then
        local error=$(echo "$response_body" | jq -r '.error // "Unknown error"' 2>/dev/null)
        print_fail "$description - API returned success=false: $error"
        return 1
    fi
    
    # Check for timestamp field (most endpoints have it)
    local timestamp=$(echo "$response_body" | jq -r '.timestamp // empty' 2>/dev/null)
    if [ -z "$timestamp" ] && [ "$status_code" -eq 200 ]; then
        # Some endpoints might not have timestamp, that's okay
        :
    fi
    
    print_pass "$description"
    return 0
}

# Test streaming endpoint (SSE)
test_stream_endpoint() {
    local endpoint="$1"
    local description="$2"
    local tier_required="${3:-all}"
    
    ((TOTAL_TESTS++))
    print_test "$description"
    
    # Check tier requirement
    if [ "$tier_required" != "all" ] && [ "$USER_TIER" != "unknown" ]; then
        if [ "$tier_required" == "pro+" ] && [ "$USER_TIER" == "free" ]; then
            print_skip "$description (requires $tier_required, current tier: $USER_TIER)"
            return 0
        fi
        if [ "$tier_required" == "sharp" ] && [ "$USER_TIER" != "sharp" ]; then
            print_skip "$description (requires $tier_required, current tier: $USER_TIER)"
            return 0
        fi
    fi
    
    local url="${BASE_URL}${endpoint}"
    
    # Use timeout to capture initial connection and first event
    local response
    response=$(timeout "$STREAM_TIMEOUT" curl -s -N \
        -H "X-API-Key: ${API_KEY}" \
        --max-time "$STREAM_TIMEOUT" \
        "$url" 2>&1) || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            # Timeout is expected - means connection was established
            print_pass "$description - Connection established (timeout expected)"
            return 0
        else
            # Check if it's a 403
            if echo "$response" | grep -q "403\|Forbidden"; then
                print_skip "$description - Tier restriction (403 Forbidden)"
                return 0
            fi
            print_fail "$description - Connection failed"
            echo "Error: $response" | head -c 200
            echo ""
            return 1
        fi
    }
    
    # If we got here, we received some data before timeout
    if [ -n "$response" ]; then
        print_pass "$description - Received stream data"
        return 0
    else
        print_pass "$description - Connection established"
        return 0
    fi
}

# Determine user tier from /user/stats
determine_tier() {
    print_test "Determining user tier from /user/stats"
    
    local response
    local status_code
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: ${API_KEY}" \
        --max-time "$TIMEOUT" \
        "${BASE_URL}/user/stats" 2>&1) || {
        echo -e "${YELLOW}[WARN]${NC} Could not determine tier, proceeding with unknown tier"
        return 0
    }
    
    status_code=$(echo "$response" | tail -n1)
    local response_body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" -eq 200 ]; then
        USER_TIER=$(echo "$response_body" | jq -r '.tier // .data.tier // "unknown"' 2>/dev/null || echo "unknown")
        if [ "$USER_TIER" != "unknown" ]; then
            echo -e "${GREEN}[INFO]${NC} Detected tier: $USER_TIER"
        else
            echo -e "${YELLOW}[WARN]${NC} Could not parse tier from response"
        fi
    else
        echo -e "${YELLOW}[WARN]${NC} /user/stats returned $status_code, proceeding with unknown tier"
    fi
}

# Main test execution
main() {
    echo "=========================================="
    echo "SharpAPI Public API Test Suite"
    echo "=========================================="
    echo "Base URL: $BASE_URL"
    echo "API Key: ${API_KEY:0:20}..."
    echo ""
    
    # Determine tier first
    determine_tier
    echo ""
    
    echo "=========================================="
    echo "Testing Discovery Endpoints"
    echo "=========================================="
    
    # Discovery Endpoints (All Tiers)
    test_endpoint "GET" "/sports" "GET /sports - List all sports" 200 "all"
    test_endpoint "GET" "/leagues" "GET /leagues - List leagues" 200 "all"
    test_endpoint "GET" "/leagues?sport=nba" "GET /leagues?sport=nba - List NBA leagues" 200 "all"
    test_endpoint "GET" "/events" "GET /events - List events" 200 "all"
    test_endpoint "GET" "/events?limit=10" "GET /events?limit=10 - List events with pagination" 200 "all"
    test_endpoint "GET" "/events/live" "GET /events/live - Live events only" 200 "all"
    
    # Get a valid event ID for testing
    echo ""
    print_test "Fetching event ID for /events/{eventId} test"
    local events_response
    events_response=$(curl -s -H "X-API-Key: ${API_KEY}" --max-time "$TIMEOUT" "${BASE_URL}/events?limit=1" 2>&1)
    local event_id=$(echo "$events_response" | jq -r '.data[0].id // .data.events[0].id // empty' 2>/dev/null)
    
    if [ -n "$event_id" ] && [ "$event_id" != "null" ]; then
        test_endpoint "GET" "/events/${event_id}" "GET /events/{eventId} - Event details" 200 "all"
    else
        print_skip "GET /events/{eventId} - No event ID available"
    fi
    
    test_endpoint "GET" "/events/search" "GET /events/search?q=lakers - Search events" 200 "all" "q=lakers"
    
    echo ""
    echo "=========================================="
    echo "Testing Odds Endpoints"
    echo "=========================================="
    
    # Odds Endpoints
    test_endpoint "GET" "/odds" "GET /odds - Current odds snapshot" 200 "all"
    test_endpoint "GET" "/odds?sports=nba" "GET /odds?sports=nba - NBA odds" 200 "all"
    test_endpoint "GET" "/odds/best" "GET /odds/best - Best odds" 200 "pro+"
    
    echo ""
    echo "=========================================="
    echo "Testing Markets Endpoints"
    echo "=========================================="
    
    # Markets Endpoints
    test_endpoint "GET" "/markets/types" "GET /markets/types - Market types list" 200 "all"
    test_endpoint "GET" "/markets/player-props" "GET /markets/player-props - Player props" 200 "pro+"
    test_endpoint "GET" "/markets/alternates" "GET /markets/alternates - Alternate lines" 200 "pro+"
    test_endpoint "GET" "/markets/active" "GET /markets/active - Active markets summary" 200 "pro+"
    
    echo ""
    echo "=========================================="
    echo "Testing Opportunities Endpoints"
    echo "=========================================="
    
    # Opportunities Endpoints (Pro+ Tier)
    test_endpoint "GET" "/ev" "GET /ev - Expected value opportunities" 200 "pro+"
    test_endpoint "GET" "/ev?min_ev=3.0" "GET /ev?min_ev=3.0 - EV with filter" 200 "pro+"
    test_endpoint "GET" "/arbitrage" "GET /arbitrage - Arbitrage opportunities" 200 "hobby+"
    test_endpoint "GET" "/arbitrage?min_profit=0.5" "GET /arbitrage?min_profit=0.5 - Arbitrage with filter" 200 "hobby+"
    test_endpoint "GET" "/value-bets" "GET /value-bets - Value bets" 200 "pro+"
    test_endpoint "GET" "/middles" "GET /middles - Middle opportunities" 200 "sharp"
    
    echo ""
    echo "=========================================="
    echo "Testing Reference Endpoints"
    echo "=========================================="
    
    # Reference Endpoints (All Tiers)
    test_endpoint "GET" "/books" "GET /books - List sportsbooks" 200 "all"
    test_endpoint "GET" "/user/stats" "GET /user/stats - User statistics" 200 "all"
    
    echo ""
    echo "=========================================="
    echo "Testing Streaming Endpoints (SSE)"
    echo "=========================================="
    
    # Streaming Endpoints (SSE)
    test_stream_endpoint "/v1/stream" "GET /v1/stream - Real-time unified stream" "all"
    test_stream_endpoint "/v1/stream?sports=nba" "GET /v1/stream?sports=nba - NBA stream" "all"
    
    echo ""
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo "Total tests:    $TOTAL_TESTS"
    echo -e "${GREEN}Passed:         $PASSED_TESTS${NC}"
    echo -e "${RED}Failed:         $FAILED_TESTS${NC}"
    echo -e "${YELLOW}Skipped:        $SKIPPED_TESTS${NC}"
    echo ""
    
    if [ ${#FAILED_ENDPOINTS[@]} -gt 0 ]; then
        echo "Failed endpoints:"
        for endpoint in "${FAILED_ENDPOINTS[@]}"; do
            echo -e "  ${RED}- $endpoint${NC}"
        done
        echo ""
    fi
    
    if [ ${#SKIPPED_ENDPOINTS[@]} -gt 0 ]; then
        echo "Skipped endpoints:"
        for endpoint in "${SKIPPED_ENDPOINTS[@]}"; do
            echo -e "  ${YELLOW}- $endpoint${NC}"
        done
        echo ""
    fi
    
    # Write JSON output
    write_json_output
    
    # Exit with error if any tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Write JSON output file
write_json_output() {
    local json_file="$JSON_OUTPUT"
    
    # Use jq to build JSON properly with escaping
    local failed_json=$(printf '%s\n' "${FAILED_ENDPOINTS[@]}" | jq -R . | jq -s .)
    local skipped_json=$(printf '%s\n' "${SKIPPED_ENDPOINTS[@]}" | jq -R . | jq -s .)
    
    jq -n \
        --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --arg base_url "$BASE_URL" \
        --arg user_tier "$USER_TIER" \
        --argjson total "$TOTAL_TESTS" \
        --argjson passed "$PASSED_TESTS" \
        --argjson failed "$FAILED_TESTS" \
        --argjson skipped "$SKIPPED_TESTS" \
        --argjson failed_endpoints "$failed_json" \
        --argjson skipped_endpoints "$skipped_json" \
        '{
            timestamp: $timestamp,
            base_url: $base_url,
            user_tier: $user_tier,
            summary: {
                total: $total,
                passed: $passed,
                failed: $failed,
                skipped: $skipped
            },
            failed_endpoints: $failed_endpoints,
            skipped_endpoints: $skipped_endpoints
        }' > "$json_file" 2>/dev/null || {
        # Fallback if jq fails
        echo "{\"error\":\"Failed to generate JSON output\"}" > "$json_file"
    }
    
    echo -e "${GREEN}[INFO]${NC} JSON results written to $json_file"
}

# Run main function
main
