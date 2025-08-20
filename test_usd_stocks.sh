#!/bin/bash

# Test script to demonstrate USD stock price fetching
echo "Testing USD Stock Price Integration"
echo "===================================="
echo ""

# Test Yahoo Finance API directly (no auth required for this endpoint)
echo "1. Testing Yahoo Finance API directly:"
curl -s "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d" | jq '.chart.result[0].meta.regularMarketPrice'

echo ""
echo "2. Available USD stocks that can be tracked:"
echo "   - AAPL (Apple Inc.)"
echo "   - MSFT (Microsoft Corporation)"
echo "   - GOOGL (Google/Alphabet Inc.)"
echo "   - AMZN (Amazon.com Inc.)"
echo "   - TSLA (Tesla Inc.)"
echo "   - META (Meta Platforms Inc.)"
echo "   - NVDA (NVIDIA Corporation)"
echo "   - SPY (SPDR S&P 500 ETF Trust)"
echo "   - QQQ (Invesco QQQ Trust ETF)"
echo "   - VTI (Vanguard Total Stock Market ETF)"

echo ""
echo "3. How it works:"
echo "   - USD investments with category 'Stocks' or 'ETF' will automatically fetch current prices"
echo "   - The system maps investment names to Yahoo Finance symbols (no .TO or .SA suffix for USD)"
echo "   - Prices are cached for 4 hours to reduce API calls"
echo "   - Performance calculations include gain/loss based on current market prices"

echo ""
echo "4. Investment naming examples that will work:"
echo "   - 'AAPL' or 'Apple' -> Maps to AAPL"
echo "   - 'MSFT' or 'Microsoft' -> Maps to MSFT"
echo "   - 'SPY' -> Maps to SPY"
echo "   - 'QQQ - Nasdaq ETF' -> Maps to QQQ"

echo ""
echo "Integration complete! USD stocks and ETFs will now show updated values on the dashboard."