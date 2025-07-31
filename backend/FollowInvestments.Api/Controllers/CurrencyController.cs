using Microsoft.AspNetCore.Mvc;
using FollowInvestments.Api.Services;
using FollowInvestments.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FollowInvestments.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CurrencyController : ControllerBase
{
    private readonly ICurrencyService _currencyService;
    private readonly InvestmentContext _context;
    private readonly ILogger<CurrencyController> _logger;

    public CurrencyController(ICurrencyService currencyService, InvestmentContext context, ILogger<CurrencyController> logger)
    {
        _currencyService = currencyService;
        _context = context;
        _logger = logger;
    }

    [HttpGet("rates")]
    public async Task<ActionResult<Dictionary<string, decimal>>> GetAllRates()
    {
        try
        {
            var rates = await _currencyService.GetAllCurrentRatesAsync();
            return Ok(rates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all exchange rates");
            return StatusCode(500, "Error retrieving exchange rates");
        }
    }

    [HttpGet("rate/{fromCurrency}/{toCurrency}")]
    public async Task<ActionResult<decimal>> GetExchangeRate(string fromCurrency, string toCurrency)
    {
        try
        {
            var rate = await _currencyService.GetExchangeRateAsync(fromCurrency.ToUpper(), toCurrency.ToUpper());
            if (!rate.HasValue)
            {
                return NotFound($"Exchange rate from {fromCurrency} to {toCurrency} not found");
            }
            return Ok(rate.Value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error getting exchange rate from {fromCurrency} to {toCurrency}");
            return StatusCode(500, "Error retrieving exchange rate");
        }
    }

    [HttpPost("convert")]
    public async Task<ActionResult<decimal>> ConvertCurrency([FromBody] CurrencyConversionRequest request)
    {
        try
        {
            var convertedAmount = await _currencyService.ConvertCurrencyAsync(
                request.Amount, 
                request.FromCurrency.ToUpper(), 
                request.ToCurrency.ToUpper()
            );
            return Ok(convertedAmount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error converting {request.Amount} from {request.FromCurrency} to {request.ToCurrency}");
            return StatusCode(500, "Error converting currency");
        }
    }

    [HttpPost("update-rates")]
    public async Task<ActionResult> UpdateExchangeRates()
    {
        try
        {
            await _currencyService.UpdateAllExchangeRatesAsync();
            return Ok("Exchange rates updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating exchange rates");
            return StatusCode(500, "Error updating exchange rates");
        }
    }

    [HttpGet("portfolio/{currency}")]
    public async Task<ActionResult<ConvertedPortfolioData>> GetPortfolioInCurrency(string currency)
    {
        try
        {
            var targetCurrency = currency.ToUpper();
            var investments = await _context.Investments
                .Include(i => i.Account)
                .ToListAsync();

            var convertedInvestments = new List<ConvertedInvestment>();
            decimal totalValue = 0;

            foreach (var investment in investments)
            {
                var originalValue = investment.Total;
                var convertedValue = await _currencyService.ConvertCurrencyAsync(
                    originalValue, 
                    investment.Currency.ToString(), 
                    targetCurrency
                );

                convertedInvestments.Add(new ConvertedInvestment
                {
                    Id = investment.Id,
                    Name = investment.Name,
                    OriginalValue = originalValue,
                    OriginalCurrency = investment.Currency.ToString(),
                    ConvertedValue = convertedValue,
                    TargetCurrency = targetCurrency,
                    Account = investment.Account.Name,
                    Quantity = investment.Quantity,
                    Date = investment.Date
                });

                totalValue += convertedValue;
            }

            return Ok(new ConvertedPortfolioData
            {
                TargetCurrency = targetCurrency,
                TotalValue = totalValue,
                Investments = convertedInvestments,
                ConversionTimestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error getting portfolio in {currency}");
            return StatusCode(500, "Error converting portfolio");
        }
    }
}

public class CurrencyConversionRequest
{
    public decimal Amount { get; set; }
    public string FromCurrency { get; set; } = string.Empty;
    public string ToCurrency { get; set; } = string.Empty;
}

public class ConvertedInvestment
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal OriginalValue { get; set; }
    public string OriginalCurrency { get; set; } = string.Empty;
    public decimal ConvertedValue { get; set; }
    public string TargetCurrency { get; set; } = string.Empty;
    public string Account { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public DateTime Date { get; set; }
}

public class ConvertedPortfolioData
{
    public string TargetCurrency { get; set; } = string.Empty;
    public decimal TotalValue { get; set; }
    public List<ConvertedInvestment> Investments { get; set; } = new();
    public DateTime ConversionTimestamp { get; set; }
}