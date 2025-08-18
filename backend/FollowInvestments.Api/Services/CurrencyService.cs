using FollowInvestments.Api.Data;
using FollowInvestments.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FollowInvestments.Api.Services;

public class CurrencyService : ICurrencyService
{
    private readonly InvestmentContext _context;
    private readonly HttpClient _httpClient;
    private readonly ILogger<CurrencyService> _logger;

    // Currency pairs we need to track (all pairs between USD, CAD, BRL)
    private readonly string[] _currencyPairs = {
        "CADUSD=X", "USDCAD=X",
        "BRLUSD=X", "USDBRL=X", 
        "CADBRL=X", "BRLCAD=X"
    };

    public CurrencyService(InvestmentContext context, HttpClient httpClient, ILogger<CurrencyService> logger)
    {
        _context = context;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<decimal?> GetExchangeRateAsync(string fromCurrency, string toCurrency)
    {
        if (fromCurrency == toCurrency)
            return 1.0m;

        // Try to get from database first (cache)
        var cachedRate = await _context.ExchangeRates
            .FirstOrDefaultAsync(er => er.FromCurrency == fromCurrency && er.ToCurrency == toCurrency);

        // If cached rate is recent (less than 24 hours old), use it
        if (cachedRate != null && cachedRate.LastUpdated > DateTime.UtcNow.AddHours(-24))
        {
            _logger.LogDebug("Using cached rate for {FromCurrency} to {ToCurrency}: {Rate} (cached at {CachedTime})", 
                fromCurrency, toCurrency, cachedRate.Rate, cachedRate.LastUpdated);
            return cachedRate.Rate;
        }

        // Fetch from external APIs (ExchangeRate-API first, Yahoo Finance as fallback)
        var rate = await FetchRateFromExternalApiAsync(fromCurrency, toCurrency);
        if (rate.HasValue)
        {
            await SaveOrUpdateRateAsync(fromCurrency, toCurrency, rate.Value);
        }

        return rate;
    }

    public async Task UpdateAllExchangeRatesAsync()
    {
        _logger.LogInformation("Updating all exchange rates...");

        foreach (var pair in _currencyPairs)
        {
            var currencies = ParseCurrencyPair(pair);
            if (currencies.HasValue)
            {
                var rate = await FetchRateFromExternalApiAsync(currencies.Value.From, currencies.Value.To);
                if (rate.HasValue)
                {
                    await SaveOrUpdateRateAsync(currencies.Value.From, currencies.Value.To, rate.Value);
                    _logger.LogInformation($"Updated {currencies.Value.From} to {currencies.Value.To}: {rate.Value}");
                }
            }
        }
    }

    public async Task<decimal> ConvertCurrencyAsync(decimal amount, string fromCurrency, string toCurrency)
    {
        if (fromCurrency == toCurrency)
            return amount;

        var rate = await GetExchangeRateAsync(fromCurrency, toCurrency);
        if (!rate.HasValue)
        {
            throw new InvalidOperationException($"Could not get exchange rate from {fromCurrency} to {toCurrency}");
        }

        return amount * rate.Value;
    }

    public async Task<Dictionary<string, decimal>> GetAllCurrentRatesAsync()
    {
        var rates = await _context.ExchangeRates
            .Where(er => er.LastUpdated > DateTime.UtcNow.AddHours(-24))
            .ToDictionaryAsync(er => $"{er.FromCurrency}{er.ToCurrency}", er => er.Rate);

        return rates;
    }

    public async Task<DateTime?> GetLastUpdateTimeAsync()
    {
        var lastUpdate = await _context.ExchangeRates
            .OrderByDescending(er => er.LastUpdated)
            .Select(er => er.LastUpdated)
            .FirstOrDefaultAsync();

        return lastUpdate == default ? null : lastUpdate;
    }

    private async Task<decimal?> FetchRateFromExternalApiAsync(string fromCurrency, string toCurrency)
    {
        // Try ExchangeRate-API first (more reliable)
        var rate = await FetchRateFromExchangeRateApiAsync(fromCurrency, toCurrency);
        if (rate.HasValue)
        {
            return rate;
        }

        // Fallback to Yahoo Finance
        try
        {
            var currencyPair = $"{fromCurrency}{toCurrency}=X";
            var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{currencyPair}?interval=1d&range=1d";

            _logger.LogInformation($"Fetching exchange rate for {currencyPair} from Yahoo Finance (fallback)");

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"Yahoo Finance API returned {response.StatusCode} for {currencyPair}");
                return null;
            }

            var jsonContent = await response.Content.ReadAsStringAsync();
            var yahooResponse = JsonSerializer.Deserialize<YahooCurrencyResponse>(jsonContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var yahooRate = yahooResponse?.Chart?.Result?.FirstOrDefault()?.Meta?.RegularMarketPrice;
            if (yahooRate.HasValue)
            {
                _logger.LogInformation($"Fetched rate for {currencyPair}: {yahooRate.Value}");
                return yahooRate.Value;
            }

            _logger.LogWarning($"No rate found in Yahoo Finance response for {currencyPair}");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching exchange rate for {fromCurrency} to {toCurrency}");
            return null;
        }
    }

    private async Task<decimal?> FetchRateFromExchangeRateApiAsync(string fromCurrency, string toCurrency)
    {
        try
        {
            var url = $"https://api.exchangerate-api.com/v4/latest/{fromCurrency}";
            
            _logger.LogInformation($"Fetching exchange rate for {fromCurrency} to {toCurrency} from ExchangeRate-API");

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"ExchangeRate-API returned {response.StatusCode} for {fromCurrency}");
                return null;
            }

            var jsonContent = await response.Content.ReadAsStringAsync();
            var exchangeRateResponse = JsonSerializer.Deserialize<ExchangeRateApiResponse>(jsonContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (exchangeRateResponse?.Rates?.TryGetValue(toCurrency, out var rate) == true)
            {
                _logger.LogInformation($"Fetched rate from ExchangeRate-API {fromCurrency} to {toCurrency}: {rate}");
                return rate;
            }

            _logger.LogWarning($"Currency {toCurrency} not found in ExchangeRate-API response for base {fromCurrency}");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching exchange rate from ExchangeRate-API for {fromCurrency} to {toCurrency}");
            return null;
        }
    }

    private async Task SaveOrUpdateRateAsync(string fromCurrency, string toCurrency, decimal rate)
    {
        var existingRate = await _context.ExchangeRates
            .FirstOrDefaultAsync(er => er.FromCurrency == fromCurrency && er.ToCurrency == toCurrency);

        if (existingRate != null)
        {
            existingRate.Rate = rate;
            existingRate.LastUpdated = DateTime.UtcNow;
        }
        else
        {
            var newRate = new ExchangeRate
            {
                FromCurrency = fromCurrency,
                ToCurrency = toCurrency,
                Rate = rate,
                LastUpdated = DateTime.UtcNow
            };
            _context.ExchangeRates.Add(newRate);
        }

        await _context.SaveChangesAsync();
    }

    private (string From, string To)? ParseCurrencyPair(string pair)
    {
        if (pair.EndsWith("=X") && pair.Length == 8)
        {
            var currencies = pair.Substring(0, 6);
            return (currencies.Substring(0, 3), currencies.Substring(3, 3));
        }
        return null;
    }
}

// Yahoo Finance Currency API response models
public class YahooCurrencyResponse
{
    public YahooCurrencyChart? Chart { get; set; }
}

public class YahooCurrencyChart
{
    public List<YahooCurrencyResult>? Result { get; set; }
}

public class YahooCurrencyResult
{
    public YahooCurrencyMeta? Meta { get; set; }
}

public class YahooCurrencyMeta
{
    public string? Currency { get; set; }
    public string? Symbol { get; set; }
    public decimal? RegularMarketPrice { get; set; }
    public decimal? PreviousClose { get; set; }
}

// ExchangeRate-API response models
public class ExchangeRateApiResponse
{
    public string? Base { get; set; }
    public string? Date { get; set; }
    public Dictionary<string, decimal>? Rates { get; set; }
}
