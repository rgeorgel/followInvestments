using System.Text.Json;
using FollowInvestments.Api.Models;

namespace FollowInvestments.Api.Services;

public interface IYahooFinanceService
{
    Task<List<StockPrice>> GetStockPricesAsync(string symbol, DateOnly? startDate = null, DateOnly? endDate = null);
}

public class YahooFinanceService : IYahooFinanceService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<YahooFinanceService> _logger;

    public YahooFinanceService(HttpClient httpClient, ILogger<YahooFinanceService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        
        // Configure HttpClient with required headers
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (compatible; StockPriceBot/1.0)");
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    public async Task<List<StockPrice>> GetStockPricesAsync(string symbol, DateOnly? startDate = null, DateOnly? endDate = null)
    {
        try
        {
            var url = BuildYahooFinanceUrl(symbol, startDate, endDate);
            _logger.LogInformation("Fetching stock data from Yahoo Finance: {Url}", url);

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var jsonContent = await response.Content.ReadAsStringAsync();
            var yahooResponse = JsonSerializer.Deserialize<YahooFinanceResponse>(jsonContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (yahooResponse?.Chart?.Result == null || !yahooResponse.Chart.Result.Any())
            {
                _logger.LogWarning("No data returned from Yahoo Finance for symbol: {Symbol}", symbol);
                return new List<StockPrice>();
            }

            var result = yahooResponse.Chart.Result.First();
            
            if (yahooResponse.Chart.Error != null)
            {
                _logger.LogError("Yahoo Finance API error: {Code} - {Description}", 
                    yahooResponse.Chart.Error.Code, yahooResponse.Chart.Error.Description);
                throw new InvalidOperationException($"Yahoo Finance API error: {yahooResponse.Chart.Error.Description}");
            }

            return ParseYahooFinanceResponse(result);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error occurred while fetching stock data for symbol: {Symbol}", symbol);
            throw new InvalidOperationException($"Failed to fetch stock data: {ex.Message}", ex);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON parsing error occurred while processing stock data for symbol: {Symbol}", symbol);
            throw new InvalidOperationException($"Failed to parse stock data: {ex.Message}", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while fetching stock data for symbol: {Symbol}", symbol);
            throw;
        }
    }

    private string BuildYahooFinanceUrl(string symbol, DateOnly? startDate, DateOnly? endDate)
    {
        var baseUrl = $"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}";
        var queryParams = new List<string> { "interval=1d" };

        if (startDate.HasValue && endDate.HasValue)
        {
            var startTimestamp = ((DateTimeOffset)startDate.Value.ToDateTime(TimeOnly.MinValue)).ToUnixTimeSeconds();
            var endTimestamp = ((DateTimeOffset)endDate.Value.ToDateTime(TimeOnly.MaxValue)).ToUnixTimeSeconds();
            queryParams.Add($"period1={startTimestamp}");
            queryParams.Add($"period2={endTimestamp}");
        }
        else if (startDate.HasValue)
        {
            var startTimestamp = ((DateTimeOffset)startDate.Value.ToDateTime(TimeOnly.MinValue)).ToUnixTimeSeconds();
            var endTimestamp = ((DateTimeOffset)DateTime.UtcNow).ToUnixTimeSeconds();
            queryParams.Add($"period1={startTimestamp}");
            queryParams.Add($"period2={endTimestamp}");
        }
        else
        {
            // Default to last 30 days if no dates specified
            queryParams.Add("range=30d");
        }

        return $"{baseUrl}?{string.Join("&", queryParams)}";
    }

    private List<StockPrice> ParseYahooFinanceResponse(ChartResult result)
    {
        var stockPrices = new List<StockPrice>();
        
        if (!result.Timestamp.Any() || !result.Indicators.Quote.Any())
        {
            return stockPrices;
        }

        var quote = result.Indicators.Quote.First();
        var timestamps = result.Timestamp;

        for (int i = 0; i < timestamps.Count; i++)
        {
            // Convert Unix timestamp to DateOnly
            var dateTime = DateTimeOffset.FromUnixTimeSeconds(timestamps[i]).DateTime;
            var priceDate = DateOnly.FromDateTime(dateTime);

            // Skip if we don't have a valid close price
            if (i >= quote.Close.Count || !quote.Close[i].HasValue)
                continue;

            var stockPrice = new StockPrice
            {
                Symbol = result.Meta.Symbol,
                PriceDate = priceDate,
                ClosePrice = quote.Close[i]!.Value,
                OpenPrice = i < quote.Open.Count ? quote.Open[i] : null,
                HighPrice = i < quote.High.Count ? quote.High[i] : null,
                LowPrice = i < quote.Low.Count ? quote.Low[i] : null,
                Volume = i < quote.Volume.Count ? quote.Volume[i] : null,
                Currency = result.Meta.Currency,
                ExchangeName = result.Meta.ExchangeName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            stockPrices.Add(stockPrice);
        }

        return stockPrices.OrderBy(sp => sp.PriceDate).ToList();
    }
}