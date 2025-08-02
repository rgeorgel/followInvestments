#!/bin/bash

# Currency Endpoints Validation Script
API_BASE="http://localhost:9900/api/currency"

echo "🔄 Testing Currency Endpoints"
echo "=================================="

# Test 1: Seed test rates
echo "1️⃣ Seeding test exchange rates..."
response=$(curl -s -X POST "$API_BASE/seed-test-rates")
echo "Response: $response"
echo ""

# Test 2: Get all rates
echo "2️⃣ Getting all exchange rates..."
curl -s "$API_BASE/rates" | jq . || curl -s "$API_BASE/rates"
echo ""

# Test 3: Get specific rates
echo "3️⃣ Testing specific currency rates..."
echo "BRL to CAD:"
curl -s "$API_BASE/rate/BRL/CAD"
echo ""

echo "CAD to BRL:"
curl -s "$API_BASE/rate/CAD/BRL"
echo ""

echo "BRL to USD:"
curl -s "$API_BASE/rate/BRL/USD"
echo ""

# Test 4: Currency conversion
echo "4️⃣ Testing currency conversion..."
echo "Converting 1000 BRL to CAD:"
curl -s -X POST "$API_BASE/convert" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "fromCurrency": "BRL", "toCurrency": "CAD"}'
echo ""

echo "Converting 250 CAD to BRL:"
curl -s -X POST "$API_BASE/convert" \
  -H "Content-Type: application/json" \
  -d '{"amount": 250, "fromCurrency": "CAD", "toCurrency": "BRL"}'
echo ""

echo "Converting 100 USD to CAD:"
curl -s -X POST "$API_BASE/convert" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "fromCurrency": "USD", "toCurrency": "CAD"}'
echo ""

# Test 5: Validation calculations
echo "5️⃣ Validation checks..."
echo "Expected: 1000 BRL × 0.25 = 250 CAD"
echo "Expected: 250 CAD × 4.0 = 1000 BRL"
echo "Expected: 100 USD × 1.37 = 137 CAD"
echo ""

echo "✅ Validation complete!"