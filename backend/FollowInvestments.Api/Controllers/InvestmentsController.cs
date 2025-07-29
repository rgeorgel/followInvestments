using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Data;
using FollowInvestments.Api.Models;
using FollowInvestments.Api.Services;

namespace FollowInvestments.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvestmentsController : ControllerBase
{
    private readonly InvestmentContext _context;
    private readonly IInvestmentPerformanceService _performanceService;

    public InvestmentsController(InvestmentContext context, IInvestmentPerformanceService performanceService)
    {
        _context = context;
        _performanceService = performanceService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Investment>>> GetInvestments()
    {
        return await _context.Investments
            .Include(i => i.Account)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Investment>> GetInvestment(int id)
    {
        var investment = await _context.Investments
            .Include(i => i.Account)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (investment == null)
        {
            return NotFound();
        }

        return investment;
    }

    [HttpPost]
    public async Task<ActionResult<Investment>> PostInvestment([FromBody] CreateInvestmentRequest investment)
    {
        var newInvestment = new Investment
        {
            Name = investment.Name,
            Value = investment.Value,
            Quantity = investment.Quantity,
            Currency = investment.Currency,
            Date = investment.Date.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(investment.Date, DateTimeKind.Utc) : investment.Date,
            Description = investment.Description,
            Category = investment.Category,
            AccountId = investment.AccountId
        };

        _context.Investments.Add(newInvestment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetInvestment), new { id = newInvestment.Id }, newInvestment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutInvestment(int id, Investment investment)
    {
        if (id != investment.Id)
        {
            return BadRequest();
        }

        _context.Entry(investment).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!InvestmentExists(id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInvestment(int id)
    {
        var investment = await _context.Investments.FindAsync(id);
        if (investment == null)
        {
            return NotFound();
        }

        _context.Investments.Remove(investment);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardData>> GetDashboardData()
    {
        var investments = await _context.Investments
            .Include(i => i.Account)
            .ToListAsync();
        
        // Get all accounts sorted by sort order for consistent ordering
        var allAccounts = await _context.Accounts
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

        return new DashboardData
        {
            AllInvestments = investments,
            GroupedInvestments = groupedInvestments,
            AssetsByAccount = assetsByAccount,
            AssetsByCountry = assetsByCountry,
            AssetsByCategory = assetsByCategory,
            AccountGoals = accountGoals
        };
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

    private bool InvestmentExists(int id)
    {
        return _context.Investments.Any(e => e.Id == id);
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