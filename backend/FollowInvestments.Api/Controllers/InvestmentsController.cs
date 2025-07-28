using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Data;
using FollowInvestments.Api.Models;

namespace FollowInvestments.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvestmentsController : ControllerBase
{
    private readonly InvestmentContext _context;

    public InvestmentsController(InvestmentContext context)
    {
        _context = context;
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
        
        var assetsByAccount = groupedInvestments
            .GroupBy(i => i.Account)
            .Select(g => new { Account = g.Key, Total = g.Sum(i => i.Total) })
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

        return new DashboardData
        {
            AllInvestments = investments,
            GroupedInvestments = groupedInvestments,
            AssetsByAccount = assetsByAccount,
            AssetsByCountry = assetsByCountry,
            AssetsByCategory = assetsByCategory
        };
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