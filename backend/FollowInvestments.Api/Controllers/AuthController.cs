using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Data;
using FollowInvestments.Api.Models;
using FollowInvestments.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace FollowInvestments.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly InvestmentContext _context;
    private readonly IPasswordService _passwordService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(InvestmentContext context, IPasswordService passwordService, ILogger<AuthController> logger)
    {
        _context = context;
        _passwordService = passwordService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
    {
        try
        {
            // Check if user already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

            if (existingUser != null)
            {
                return BadRequest(new { message = "User with this email already exists" });
            }

            // Validate role
            if (!string.IsNullOrEmpty(request.Role) && 
                request.Role.ToLower() != "user" && 
                request.Role.ToLower() != "admin")
            {
                return BadRequest(new { message = "Invalid role. Must be 'user' or 'admin'" });
            }

            // Create new user
            var user = new User
            {
                Name = request.Name,
                Email = request.Email.ToLower(),
                PasswordHash = _passwordService.HashPassword(request.Password),
                Role = string.IsNullOrEmpty(request.Role) ? "user" : request.Role.ToLower(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Return user info without password
            var userResponse = new UserResponse
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                CreatedAt = user.CreatedAt
            };

            _logger.LogInformation("User registered successfully: {Email}", user.Email);
            
            return Ok(new { message = "User registered successfully", user = userResponse });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering user: {Email}", request.Email);
            return StatusCode(500, new { message = "Internal server error during registration" });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            // Find user by email
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Verify password
            if (!_passwordService.VerifyPassword(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Update last login time
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Create response (for now without JWT token - can be added later)
            var userResponse = new UserResponse
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                CreatedAt = user.CreatedAt
            };

            _logger.LogInformation("User logged in successfully: {Email}", user.Email);

            return Ok(new { 
                message = "Login successful", 
                user = userResponse,
                // For now, return a simple session indicator
                sessionToken = $"session_{user.Id}_{DateTime.UtcNow.Ticks}"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login: {Email}", request.Email);
            return StatusCode(500, new { message = "Internal server error during login" });
        }
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            var users = await _context.Users
                .Select(u => new UserResponse
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }
}