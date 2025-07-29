using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Data;
using FollowInvestments.Api.Models;
using FollowInvestments.Api.Services;

namespace FollowInvestments.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StockPricesController : ControllerBase
{
    private readonly InvestmentContext _context;
    private readonly IYahooFinanceService _yahooFinanceService;
    private readonly ILogger<StockPricesController> _logger;

    public StockPricesController(
        InvestmentContext context, 
        IYahooFinanceService yahooFinanceService,
        ILogger<StockPricesController> logger)
    {
        _context = context;
        _yahooFinanceService = yahooFinanceService;
        _logger = logger;
    }

    [HttpPost("search")]
    public async Task<ActionResult<List<StockPrice>>> SearchStockPrices([FromBody] StockPriceSearchRequest request)
    {
        try
        {
            // Validate request
            if (string.IsNullOrWhiteSpace(request.Symbol))
            {
                return BadRequest("Symbol is required");
            }

            // Normalize symbol to uppercase
            var symbol = request.Symbol.Trim().ToUpper();
            
            // Set default date range if not provided (last 30 days)
            var endDate = request.EndDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var startDate = request.StartDate ?? endDate.AddDays(-30);

            // Validate date range
            if (startDate > endDate)
            {
                return BadRequest("Start date cannot be after end date");
            }

            List<StockPrice> result;

            if (request.ForceRefresh)
            {
                // Force refresh: get fresh data from Yahoo Finance and update database
                result = await RefreshStockPricesFromApi(symbol, startDate, endDate);
            }
            else
            {
                // Check if we have recent data in database first
                result = await GetStockPricesFromDatabase(symbol, startDate, endDate);
                
                // If no data found or data is stale, fetch from API
                if (!result.Any() || IsDataStale(result, endDate))
                {
                    _logger.LogInformation("No recent data found for {Symbol}, fetching from Yahoo Finance", symbol);
                    result = await RefreshStockPricesFromApi(symbol, startDate, endDate);
                }
            }

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Invalid operation while searching stock prices for symbol: {Symbol}", request.Symbol);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while searching stock prices for symbol: {Symbol}", request.Symbol);
            return StatusCode(500, "An error occurred while searching stock prices");
        }
    }

    [HttpGet("{symbol}")]
    public async Task<ActionResult<List<StockPrice>>> GetStockPrices(
        string symbol, 
        [FromQuery] DateOnly? startDate = null, 
        [FromQuery] DateOnly? endDate = null)
    {
        var request = new StockPriceSearchRequest
        {
            Symbol = symbol,
            StartDate = startDate,
            EndDate = endDate,
            ForceRefresh = false
        };

        return await SearchStockPrices(request);
    }

    [HttpDelete("{symbol}")]
    public async Task<IActionResult> DeleteStockPrices(string symbol, [FromQuery] DateOnly? date = null)
    {
        try
        {
            var normalizedSymbol = symbol.Trim().ToUpper();
            
            IQueryable<StockPrice> query = _context.StockPrices.Where(sp => sp.Symbol == normalizedSymbol);
            
            if (date.HasValue)
            {
                query = query.Where(sp => sp.PriceDate == date.Value);
            }

            var stockPrices = await query.ToListAsync();
            
            if (!stockPrices.Any())
            {
                return NotFound($"No stock prices found for symbol: {symbol}");
            }

            _context.StockPrices.RemoveRange(stockPrices);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted {Count} stock price records for symbol: {Symbol}", stockPrices.Count, symbol);
            
            return Ok(new { DeletedCount = stockPrices.Count, Symbol = symbol });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting stock prices for symbol: {Symbol}", symbol);
            return StatusCode(500, "An error occurred while deleting stock prices");
        }
    }

    [HttpGet("symbols")]
    public async Task<ActionResult<List<string>>> GetAvailableSymbols()
    {
        try
        {
            var symbols = await _context.StockPrices
                .Select(sp => sp.Symbol)
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();

            return Ok(symbols);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available symbols");
            return StatusCode(500, "An error occurred while retrieving symbols");
        }
    }

    private async Task<List<StockPrice>> GetStockPricesFromDatabase(string symbol, DateOnly startDate, DateOnly endDate)
    {
        return await _context.StockPrices
            .Where(sp => sp.Symbol == symbol && sp.PriceDate >= startDate && sp.PriceDate <= endDate)
            .OrderBy(sp => sp.PriceDate)
            .ToListAsync();
    }

    private async Task<List<StockPrice>> RefreshStockPricesFromApi(string symbol, DateOnly startDate, DateOnly endDate)
    {
        // Fetch fresh data from Yahoo Finance
        var freshData = await _yahooFinanceService.GetStockPricesAsync(symbol, startDate, endDate);
        
        if (!freshData.Any())
        {
            return new List<StockPrice>();
        }

        // Update database with fresh data
        foreach (var stockPrice in freshData)
        {
            var existing = await _context.StockPrices
                .FirstOrDefaultAsync(sp => sp.Symbol == stockPrice.Symbol && sp.PriceDate == stockPrice.PriceDate);

            if (existing != null)
            {
                // Update existing record
                existing.OpenPrice = stockPrice.OpenPrice;
                existing.HighPrice = stockPrice.HighPrice;
                existing.LowPrice = stockPrice.LowPrice;
                existing.ClosePrice = stockPrice.ClosePrice;
                existing.Volume = stockPrice.Volume;
                existing.Currency = stockPrice.Currency;
                existing.ExchangeName = stockPrice.ExchangeName;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // Add new record
                _context.StockPrices.Add(stockPrice);
            }
        }

        await _context.SaveChangesAsync();
        
        // Return the updated data
        return await GetStockPricesFromDatabase(symbol, startDate, endDate);
    }

    private bool IsDataStale(List<StockPrice> stockPrices, DateOnly requestedEndDate)
    {
        if (!stockPrices.Any())
            return true;

        // Consider data stale if:
        // 1. The latest date in our data is more than 1 day old from requested end date
        // 2. Or if the most recent update was more than 4 hours ago for today's data
        var latestDate = stockPrices.Max(sp => sp.PriceDate);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        
        // If we don't have data for the requested end date and it's not future
        if (latestDate < requestedEndDate && requestedEndDate <= today)
            return true;

        // If the data is for today, check if it's more than 4 hours old
        if (latestDate == today)
        {
            var latestRecord = stockPrices.Where(sp => sp.PriceDate == latestDate).OrderByDescending(sp => sp.UpdatedAt).First();
            return latestRecord.UpdatedAt < DateTime.UtcNow.AddHours(-4);
        }

        return false;
    }
}