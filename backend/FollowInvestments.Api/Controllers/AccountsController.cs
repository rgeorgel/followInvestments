using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Data;
using FollowInvestments.Api.Models;
using FollowInvestments.Api.Extensions;

namespace FollowInvestments.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountsController : ControllerBase
{
    private readonly InvestmentContext _context;

    public AccountsController(InvestmentContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Account>>> GetAccounts()
    {
        var userId = User.GetUserId();
        return await _context.Accounts
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Account>> GetAccount(int id)
    {
        var userId = User.GetUserId();
        var account = await _context.Accounts
            .Include(a => a.Investments)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (account == null)
        {
            return NotFound();
        }

        return account;
    }

    [HttpPost]
    public async Task<ActionResult<Account>> PostAccount([FromBody] CreateAccountRequest request)
    {
        var userId = User.GetUserId();
        var account = new Account
        {
            Name = request.Name,
            Goal1 = request.Goal1,
            Goal2 = request.Goal2,
            Goal3 = request.Goal3,
            Goal4 = request.Goal4,
            Goal5 = request.Goal5,
            SortOrder = request.SortOrder,
            UserId = userId
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAccount), new { id = account.Id }, account);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutAccount(int id, UpdateAccountRequest request)
    {
        if (id != request.Id)
        {
            return BadRequest("ID mismatch");
        }

        var userId = User.GetUserId();
        var existingAccount = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            
        if (existingAccount == null)
        {
            return NotFound();
        }

        // Update only allowed fields
        existingAccount.Name = request.Name;
        existingAccount.Goal1 = request.Goal1;
        existingAccount.Goal2 = request.Goal2;
        existingAccount.Goal3 = request.Goal3;
        existingAccount.Goal4 = request.Goal4;
        existingAccount.Goal5 = request.Goal5;
        existingAccount.SortOrder = request.SortOrder;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!AccountExists(id))
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
    public async Task<IActionResult> DeleteAccount(int id)
    {
        var userId = User.GetUserId();
        var account = await _context.Accounts
            .Include(a => a.Investments)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            
        if (account == null)
        {
            return NotFound();
        }

        // Check if account has investments
        if (account.Investments.Any())
        {
            return BadRequest("Cannot delete account with existing investments. Please move or delete investments first.");
        }

        _context.Accounts.Remove(account);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool AccountExists(int id)
    {
        var userId = User.GetUserId();
        return _context.Accounts.Any(e => e.Id == id && e.UserId == userId);
    }
}