using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Data;
using FollowInvestments.Api.Models;
using FollowInvestments.Api.Services;
using FollowInvestments.Api.Extensions;

namespace FollowInvestments.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvestmentsController : ControllerBase
{
    private readonly InvestmentContext _context;
    private readonly IInvestmentPerformanceService _performanceService;
    private readonly ICacheService _cacheService;

    public InvestmentsController(InvestmentContext context, IInvestmentPerformanceService performanceService, ICacheService cacheService)
    {
        _context = context;
        _performanceService = performanceService;
        _cacheService = cacheService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Investment>>> GetInvestments()
    {
        var userId = User.GetUserId();
        return await _context.Investments
            .Include(i => i.Account)
            .Where(i => i.UserId == userId)
            .ToListAsync();
    }


    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardData>> GetDashboardData()
    {
        var userId = User.GetUserId();
        var cacheKey = $"dashboard_user_{userId}";
        
        // Try to get from cache first
        var cachedData = await _cacheService.GetAsync<DashboardData>(cacheKey);
        if (cachedData != null)
        {
            return Ok(cachedData);
        }
        var investments = await _context.Investments
            .Include(i => i.Account)
            .Where(i => i.UserId == userId)
            .ToListAsync();
        
        // Get all accounts sorted by sort order for consistent ordering
        var allAccounts = await _context.Accounts
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .ToListAsync();
        
        // Group by category, account, and name - sum total (quantity * value)
        var groupedInvestments = investments
            .GroupBy(i => new { i.Category, AccountName = i.Account.Name, InvestmentName = i.Name })
            .Select(g => new GroupedInvestment
            {
                Category = g.Key.Category.ToString(),
                Account = g.Key.AccountName,
                Name = g.Key.InvestmentName,
                TotalQuantity = g.Sum(i => i.Quantity),
                AverageValue = g.Average(i => i.Value),
                Total = g.Sum(i => i.Total),
                Currency = g.First().Currency.ToString(),
                Country = g.First().Country
            })
            .ToList();
        
        // Get assets by account grouped and maintain sort order
        var assetsByAccountDict = groupedInvestments
            .GroupBy(i => i.Account)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Total));
        
        // Create ordered list based on account sort order
        var assetsByAccount = allAccounts
            .Where(a => assetsByAccountDict.ContainsKey(a.Name))
            .Select(a => new { Account = a.Name, Total = assetsByAccountDict[a.Name] })
            .ToList();
            
        var assetsByCountry = groupedInvestments
            .GroupBy(i => i.Country)
            .Select(g => new { Country = g.Key, Total = g.Sum(i => i.Total) })
            .ToList();

        var assetsByCategory = investments
            .GroupBy(i => i.Category)
            .Select(g => new AssetByCategory 
            { 
                Category = g.Key.ToString(), 
                Total = g.Sum(i => i.Total),
                Count = g.Count(),
                Percentage = investments.Sum(i => i.Total) > 0 ? 
                    Math.Round((double)(g.Sum(i => i.Total) / investments.Sum(i => i.Total)) * 100, 2) : 0
            })
            .OrderByDescending(a => a.Total)
            .ToList();

        // Calculate account performance including gains/losses
        var accountPerformances = await _performanceService.CalculateAllAccountsPerformanceAsync();
        
        // Calculate account goals progress - get all accounts, not just those with investments
        var accountGoals = allAccounts.Select(account => 
        {
            var accountInvestments = investments.Where(i => i.AccountId == account.Id).ToList();
            var performance = accountPerformances.FirstOrDefault(ap => ap.AccountId == account.Id);
            
            // Use current value from performance if available, otherwise use book value
            var currentValue = performance?.CurrentValue ?? accountInvestments.Sum(i => i.Total);
            
            // Determine currency based on investments, default to CAD if no investments
            var currency = accountInvestments.FirstOrDefault()?.Currency.ToString() ?? "CAD";
            
            return new AccountGoalProgress
            {
                AccountId = account.Id,
                AccountName = account.Name,
                CurrentValue = currentValue,
                Currency = currency,
                Goals = new GoalValues
                {
                    Year1 = account.Goal1,
                    Year2 = account.Goal2,
                    Year3 = account.Goal3,
                    Year4 = account.Goal4,
                    Year5 = account.Goal5
                },
                Performance = performance
            };
        }).ToList();

        // Generate timeline data for dashboard
        var timelineData = await GenerateTimelineData(investments, allAccounts);

        var dashboardData = new DashboardData
        {
            AllInvestments = investments,
            GroupedInvestments = groupedInvestments,
            AssetsByAccount = assetsByAccount,
            AssetsByCountry = assetsByCountry,
            AssetsByCategory = assetsByCategory,
            AccountGoals = accountGoals,
            TimelineData = timelineData
        };

        // Cache the result for 1 hour
        await _cacheService.SetAsync(cacheKey, dashboardData, TimeSpan.FromHours(1));

        return dashboardData;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Investment>> GetInvestment(int id)
    {
        var userId = User.GetUserId();
        var investment = await _context.Investments
            .Include(i => i.Account)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);

        if (investment == null)
        {
            return NotFound();
        }

        return investment;
    }

    [HttpPost]
    public async Task<ActionResult<Investment>> PostInvestment([FromBody] CreateInvestmentRequest investment)
    {
        var userId = User.GetUserId();
        
        // Verify the account belongs to the user
        var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == investment.AccountId && a.UserId == userId);
        if (account == null)
        {
            return BadRequest("Invalid account or account does not belong to user");
        }

        var newInvestment = new Investment
        {
            Name = investment.Name,
            Value = investment.Value,
            Quantity = investment.Quantity,
            Currency = investment.Currency,
            Date = investment.Date.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(investment.Date, DateTimeKind.Utc) : investment.Date,
            Description = investment.Description,
            Category = investment.Category,
            AccountId = investment.AccountId,
            UserId = userId
        };

        _context.Investments.Add(newInvestment);
        await _context.SaveChangesAsync();

        // Invalidate dashboard cache
        await InvalidateDashboardCache(userId);

        return CreatedAtAction(nameof(GetInvestment), new { id = newInvestment.Id }, newInvestment);
    }

    private async Task InvalidateDashboardCache(int userId)
    {
        var dashboardCacheKey = $"dashboard_user_{userId}";
        var timelineCacheKey = $"timeline_user_{userId}";
        
        await _cacheService.RemoveAsync(dashboardCacheKey);
        await _cacheService.RemoveAsync(timelineCacheKey);
    }

    [HttpPut("{id}/test")]
    public async Task<IActionResult> TestUpdateRequest(int id, [FromBody] UpdateInvestmentRequest updateRequest)
    {
        // Just return the received data to test deserialization
        return Ok(new { 
            ReceivedId = id,
            UpdateRequest = updateRequest,
            ModelStateValid = ModelState.IsValid,
            ModelStateErrors = ModelState.Where(x => x.Value.Errors.Count > 0)
                .ToDictionary(x => x.Key, x => x.Value.Errors.Select(e => e.ErrorMessage))
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutInvestment(int id, [FromBody] UpdateInvestmentRequest updateRequest)
    {
        try
        {
            if (id != updateRequest.Id)
            {
                return BadRequest("ID mismatch");
            }

            var userId = User.GetUserId();
            var existingInvestment = await _context.Investments
                .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
            if (existingInvestment == null)
            {
                return NotFound();
            }

            // Update only the fields from the request
            existingInvestment.Name = updateRequest.Name;
            existingInvestment.Value = updateRequest.Value;
            existingInvestment.Quantity = updateRequest.Quantity;
            existingInvestment.Currency = updateRequest.Currency;
            existingInvestment.Date = updateRequest.Date.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(updateRequest.Date, DateTimeKind.Utc) : updateRequest.Date;
            existingInvestment.Description = updateRequest.Description;
            existingInvestment.Category = updateRequest.Category;
            existingInvestment.AccountId = updateRequest.AccountId;

            await _context.SaveChangesAsync();
            
            // Invalidate dashboard cache
            await InvalidateDashboardCache(userId);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest($"Error: {ex.Message}");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInvestment(int id)
    {
        var userId = User.GetUserId();
        var investment = await _context.Investments
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        if (investment == null)
        {
            return NotFound();
        }

        _context.Investments.Remove(investment);
        await _context.SaveChangesAsync();

        // Invalidate dashboard cache
        await InvalidateDashboardCache(userId);

        return NoContent();
    }

    [HttpGet("portfolio/timeline")]
    public async Task<ActionResult<InvestmentTimelineData>> GetTimeline()
    {
        var userId = User.GetUserId();
        var cacheKey = $"timeline_user_{userId}";
        
        // Try to get from cache first
        var cachedData = await _cacheService.GetAsync<InvestmentTimelineData>(cacheKey);
        if (cachedData != null)
        {
            return Ok(cachedData);
        }
        var investments = await _context.Investments
            .Include(i => i.Account)
            .Where(i => i.UserId == userId)
            .ToListAsync();

        var allAccounts = await _context.Accounts
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .ToListAsync();

        // Create timeline data points based on investment dates
        var timelinePoints = new List<TimelinePoint>();
        
        // Get all unique investment dates and sort them
        var investmentDates = investments
            .Select(i => i.Date.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        // Calculate cumulative portfolio value at each date
        foreach (var date in investmentDates)
        {
            var investmentsUpToDate = investments
                .Where(i => i.Date.Date <= date)
                .ToList();

            var totalValue = investmentsUpToDate.Sum(i => i.Total);
            
            timelinePoints.Add(new TimelinePoint
            {
                Date = date,
                TotalValue = totalValue,
                BrlValue = investmentsUpToDate.Where(i => i.Currency == Currency.BRL).Sum(i => i.Total),
                CadValue = investmentsUpToDate.Where(i => i.Currency == Currency.CAD).Sum(i => i.Total)
            });
        }

        // Create goal markers for visualization
        var goalMarkers = new List<GoalMarker>();
        var currentYear = DateTime.Now.Year;
        
        foreach (var account in allAccounts)
        {
            var currency = GetAccountCurrency(account);
            if (account.Goal1.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 1, Value = account.Goal1.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 1" });
            if (account.Goal2.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 2, Value = account.Goal2.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 2" });
            if (account.Goal3.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 3, Value = account.Goal3.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 3" });
            if (account.Goal4.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 4, Value = account.Goal4.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 4" });
            if (account.Goal5.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 5, Value = account.Goal5.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 5" });
        }

        var timelineData = new InvestmentTimelineData
        {
            TimelinePoints = timelinePoints,
            GoalMarkers = goalMarkers,
            CurrentTotalValue = timelinePoints.LastOrDefault()?.TotalValue ?? 0,
            CurrentBrlValue = timelinePoints.LastOrDefault()?.BrlValue ?? 0,
            CurrentCadValue = timelinePoints.LastOrDefault()?.CadValue ?? 0
        };

        // Cache the result for 1 hour
        await _cacheService.SetAsync(cacheKey, timelineData, TimeSpan.FromHours(1));

        return timelineData;
    }

    private string GetAccountCurrency(Account account)
    {
        // Determine account currency based on its investments
        var accountInvestments = _context.Investments.Where(i => i.AccountId == account.Id).ToList();
        if (!accountInvestments.Any()) return "CAD"; // Default
        
        var brlCount = accountInvestments.Count(i => i.Currency == Currency.BRL);
        var cadCount = accountInvestments.Count(i => i.Currency == Currency.CAD);
        
        return brlCount > cadCount ? "BRL" : "CAD";
    }

    [HttpGet("account/{accountId}/performance")]
    public async Task<ActionResult<AccountPerformance>> GetAccountPerformance(int accountId)
    {
        try
        {
            var performance = await _performanceService.CalculateAccountPerformanceAsync(accountId);
            return Ok(performance);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while calculating account performance");
        }
    }

    [HttpGet("performance")]
    public async Task<ActionResult<List<AccountPerformance>>> GetAllAccountsPerformance()
    {
        try
        {
            var performances = await _performanceService.CalculateAllAccountsPerformanceAsync();
            return Ok(performances);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while calculating account performances");
        }
    }

    private async Task<InvestmentTimelineData> GenerateTimelineData(List<Investment> investments, List<Account> allAccounts)
    {
        // Create timeline data points based on investment dates
        var timelinePoints = new List<TimelinePoint>();
        
        // Get all unique investment dates and sort them
        var investmentDates = investments
            .Select(i => i.Date.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        // Calculate cumulative portfolio value at each date
        foreach (var date in investmentDates)
        {
            var investmentsUpToDate = investments
                .Where(i => i.Date.Date <= date)
                .ToList();

            var totalValue = investmentsUpToDate.Sum(i => i.Total);
            
            timelinePoints.Add(new TimelinePoint
            {
                Date = date,
                TotalValue = totalValue,
                BrlValue = investmentsUpToDate.Where(i => i.Currency == Currency.BRL).Sum(i => i.Total),
                CadValue = investmentsUpToDate.Where(i => i.Currency == Currency.CAD).Sum(i => i.Total)
            });
        }

        // Create goal markers for visualization
        var goalMarkers = new List<GoalMarker>();
        var currentYear = DateTime.Now.Year;
        
        foreach (var account in allAccounts)
        {
            var currency = GetAccountCurrency(account);
            if (account.Goal1.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 1, Value = account.Goal1.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 1" });
            if (account.Goal2.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 2, Value = account.Goal2.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 2" });
            if (account.Goal3.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 3, Value = account.Goal3.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 3" });
            if (account.Goal4.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 4, Value = account.Goal4.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 4" });
            if (account.Goal5.HasValue)
                goalMarkers.Add(new GoalMarker { Year = currentYear + 5, Value = account.Goal5.Value, Currency = currency, AccountName = account.Name, Label = $"{account.Name} Year 5" });
        }

        return new InvestmentTimelineData
        {
            TimelinePoints = timelinePoints,
            GoalMarkers = goalMarkers,
            CurrentTotalValue = timelinePoints.LastOrDefault()?.TotalValue ?? 0,
            CurrentBrlValue = timelinePoints.LastOrDefault()?.BrlValue ?? 0,
            CurrentCadValue = timelinePoints.LastOrDefault()?.CadValue ?? 0
        };
    }

    private bool InvestmentExists(int id)
    {
        var userId = User.GetUserId();
        return _context.Investments.Any(e => e.Id == id && e.UserId == userId);
    }
}

public class DashboardData
{
    public List<Investment> AllInvestments { get; set; } = new();
    public List<GroupedInvestment> GroupedInvestments { get; set; } = new();
    public object AssetsByAccount { get; set; } = new();
    public object AssetsByCountry { get; set; } = new();
    public List<AssetByCategory> AssetsByCategory { get; set; } = new();
    public List<AccountGoalProgress> AccountGoals { get; set; } = new();
    public InvestmentTimelineData? TimelineData { get; set; }
}

public class GroupedInvestment
{
    public string Category { get; set; } = string.Empty;
    public string Account { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal TotalQuantity { get; set; }
    public decimal AverageValue { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class AssetByCategory
{
    public string Category { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class AccountGoalProgress
{
    public int AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public decimal CurrentValue { get; set; }
    public string Currency { get; set; } = string.Empty;
    public GoalValues Goals { get; set; } = new();
    public AccountPerformance? Performance { get; set; }
}

public class GoalValues
{
    public decimal? Year1 { get; set; }
    public decimal? Year2 { get; set; }
    public decimal? Year3 { get; set; }
    public decimal? Year4 { get; set; }
    public decimal? Year5 { get; set; }
}

