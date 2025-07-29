using FollowInvestments.Api.Data;
using FollowInvestments.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FollowInvestments.Api.Services;

public interface IInvestmentPerformanceService
{
    Task<List<InvestmentPerformance>> CalculatePerformanceAsync(List<Investment> investments);
    Task<AccountPerformance> CalculateAccountPerformanceAsync(int accountId);
    Task<List<AccountPerformance>> CalculateAllAccountsPerformanceAsync();
}

public class InvestmentPerformanceService : IInvestmentPerformanceService
{
    private readonly InvestmentContext _context;
    private readonly IYahooFinanceService _yahooFinanceService;
    private readonly ILogger<InvestmentPerformanceService> _logger;

    public InvestmentPerformanceService(
        InvestmentContext context,
        IYahooFinanceService yahooFinanceService,
        ILogger<InvestmentPerformanceService> logger)
    {
        _context = context;
        _yahooFinanceService = yahooFinanceService;
        _logger = logger;
    }

    public async Task<List<InvestmentPerformance>> CalculatePerformanceAsync(List<Investment> investments)
    {
        var performances = new List<InvestmentPerformance>();

        foreach (var investment in investments)
        {
            var performance = await CalculateSingleInvestmentPerformanceAsync(investment);
            performances.Add(performance);
        }

        return performances;
    }

    public async Task<AccountPerformance> CalculateAccountPerformanceAsync(int accountId)
    {
        var account = await _context.Accounts
            .Include(a => a.Investments)
            .FirstOrDefaultAsync(a => a.Id == accountId);

        if (account == null)
            throw new ArgumentException($"Account with ID {accountId} not found");

        var investmentPerformances = await CalculatePerformanceAsync(account.Investments.ToList());

        return new AccountPerformance
        {
            AccountId = account.Id,
            AccountName = account.Name,
            Investments = investmentPerformances,
            TotalInvested = investmentPerformances.Sum(ip => ip.TotalInvested),
            CurrentValue = investmentPerformances.Sum(ip => ip.CurrentValue),
            TotalGainLoss = investmentPerformances.Sum(ip => ip.GainLoss),
            TotalGainLossPercentage = investmentPerformances.Sum(ip => ip.TotalInvested) > 0 
                ? (investmentPerformances.Sum(ip => ip.GainLoss) / investmentPerformances.Sum(ip => ip.TotalInvested)) * 100 
                : 0
        };
    }

    public async Task<List<AccountPerformance>> CalculateAllAccountsPerformanceAsync()
    {
        var accounts = await _context.Accounts
            .Include(a => a.Investments)
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .ToListAsync();

        var accountPerformances = new List<AccountPerformance>();

        foreach (var account in accounts)
        {
            var performance = await CalculateAccountPerformanceAsync(account.Id);
            accountPerformances.Add(performance);
        }

        return accountPerformances;
    }

    private async Task<InvestmentPerformance> CalculateSingleInvestmentPerformanceAsync(Investment investment)
    {
        var currentPrice = await GetCurrentPriceAsync(investment);
        var totalInvested = investment.Quantity * investment.Value;
        var currentValue = currentPrice.HasValue ? investment.Quantity * currentPrice.Value : totalInvested;
        var gainLoss = currentValue - totalInvested;
        var gainLossPercentage = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

        return new InvestmentPerformance
        {
            InvestmentId = investment.Id,
            Name = investment.Name,
            Symbol = MapInvestmentToSymbol(investment),
            Category = investment.Category.ToString(),
            Currency = investment.Currency.ToString(),
            Quantity = investment.Quantity,
            PurchasePrice = investment.Value,
            CurrentPrice = currentPrice,
            TotalInvested = totalInvested,
            CurrentValue = currentValue,
            GainLoss = gainLoss,
            GainLossPercentage = gainLossPercentage,
            LastUpdated = DateTime.UtcNow,
            HasCurrentPrice = currentPrice.HasValue
        };
    }

    private async Task<decimal?> GetCurrentPriceAsync(Investment investment)
    {
        try
        {
            // Only get current prices for stocks, ETFs, and FIIs
            if (investment.Category != Category.Stocks && 
                investment.Category != Category.ETF && 
                investment.Category != Category.FIIs)
            {
                return null;
            }

            var symbol = MapInvestmentToSymbol(investment);
            if (string.IsNullOrEmpty(symbol))
            {
                _logger.LogWarning("Could not map investment {InvestmentName} to stock symbol", investment.Name);
                return null;
            }

            // Check if we have recent price data in the database
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var recentPrice = await _context.StockPrices
                .Where(sp => sp.Symbol == symbol && sp.PriceDate == today)
                .OrderByDescending(sp => sp.UpdatedAt)
                .FirstOrDefaultAsync();

            // If we have today's data and it's less than 4 hours old, use it
            if (recentPrice != null && recentPrice.UpdatedAt > DateTime.UtcNow.AddHours(-4))
            {
                return recentPrice.ClosePrice;
            }

            // Otherwise, fetch fresh data from Yahoo Finance
            var stockPrices = await _yahooFinanceService.GetStockPricesAsync(symbol, today, today);
            var todayPrice = stockPrices.FirstOrDefault(sp => sp.PriceDate == today);

            if (todayPrice != null)
            {
                // Update database with fresh data
                if (recentPrice != null)
                {
                    recentPrice.ClosePrice = todayPrice.ClosePrice;
                    recentPrice.OpenPrice = todayPrice.OpenPrice;
                    recentPrice.HighPrice = todayPrice.HighPrice;
                    recentPrice.LowPrice = todayPrice.LowPrice;
                    recentPrice.Volume = todayPrice.Volume;
                    recentPrice.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.StockPrices.Add(todayPrice);
                }
                
                await _context.SaveChangesAsync();
                return todayPrice.ClosePrice;
            }

            // If no current data available, try to get the most recent price
            var lastPrice = await _context.StockPrices
                .Where(sp => sp.Symbol == symbol)
                .OrderByDescending(sp => sp.PriceDate)
                .FirstOrDefaultAsync();

            return lastPrice?.ClosePrice;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current price for investment {InvestmentName}", investment.Name);
            return null;
        }
    }

    private string MapInvestmentToSymbol(Investment investment)
    {
        // This method maps investment names to stock symbols
        // You can extend this logic based on your investment naming conventions

        var name = investment.Name.ToUpper().Trim();

        // Handle direct symbol mappings (when the name is already a symbol)
        if (name.EndsWith(".TO") || name.EndsWith(".SA"))
        {
            return name;
        }

        // Common Canadian stocks
        var canadianMappings = new Dictionary<string, string>
        {
            ["SHOP"] = "SHOP.TO",
            ["SHOPIFY"] = "SHOP.TO",
            ["RY"] = "RY.TO",
            ["ROYAL BANK"] = "RY.TO",
            ["TD"] = "TD.TO",
            ["CNR"] = "CNR.TO",
            ["VFV"] = "VFV.TO",
            ["XQQ"] = "XQQ.TO",
            ["ZWB"] = "ZWB.TO",
            ["BRE"] = "BRE.TO"
        };

        // Common Brazilian stocks and FIIs
        var brazilianMappings = new Dictionary<string, string>
        {
            ["PETR4"] = "PETR4.SA",
            ["PETROBRAS"] = "PETR4.SA",
            ["ITUB4"] = "ITUB4.SA",
            ["ITAU"] = "ITUB4.SA",
            ["RBRF11"] = "RBRF11.SA",
            ["HGLG11"] = "HGLG11.SA",
            ["BTLG11"] = "BTLG11.SA"
        };

        // Check mappings based on currency
        if (investment.Currency == Currency.CAD)
        {
            foreach (var mapping in canadianMappings)
            {
                if (name.Contains(mapping.Key))
                {
                    return mapping.Value;
                }
            }
        }
        else if (investment.Currency == Currency.BRL)
        {
            foreach (var mapping in brazilianMappings)
            {
                if (name.Contains(mapping.Key))
                {
                    return mapping.Value;
                }
            }
        }

        // If no mapping found, try to extract symbol from common patterns
        // Example: "VFV - S&P 500" -> "VFV.TO"
        var parts = name.Split(new[] { ' ', '-', ':', '|' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length > 0)
        {
            var potentialSymbol = parts[0];
            if (potentialSymbol.Length >= 2 && potentialSymbol.Length <= 6 && potentialSymbol.All(char.IsLetterOrDigit))
            {
                var suffix = investment.Currency == Currency.CAD ? ".TO" : ".SA";
                return potentialSymbol + suffix;
            }
        }

        return string.Empty;
    }
}

public class InvestmentPerformance
{
    public int InvestmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal? CurrentPrice { get; set; }
    public decimal TotalInvested { get; set; }
    public decimal CurrentValue { get; set; }
    public decimal GainLoss { get; set; }
    public decimal GainLossPercentage { get; set; }
    public DateTime LastUpdated { get; set; }
    public bool HasCurrentPrice { get; set; }
}

public class AccountPerformance
{
    public int AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public List<InvestmentPerformance> Investments { get; set; } = new();
    public decimal TotalInvested { get; set; }
    public decimal CurrentValue { get; set; }
    public decimal TotalGainLoss { get; set; }
    public decimal TotalGainLossPercentage { get; set; }
}