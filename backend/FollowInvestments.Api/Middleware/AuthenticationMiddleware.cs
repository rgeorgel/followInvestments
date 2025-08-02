using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Data;
using System.Security.Claims;

namespace FollowInvestments.Api.Middleware;

public class AuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuthenticationMiddleware> _logger;

    public AuthenticationMiddleware(RequestDelegate next, ILogger<AuthenticationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, InvestmentContext dbContext)
    {
        var path = context.Request.Path.Value?.ToLower();
        
        // Skip authentication for public endpoints
        if (IsPublicEndpoint(path))
        {
            await _next(context);
            return;
        }

        // Check for session token
        var sessionToken = GetSessionToken(context);
        if (string.IsNullOrEmpty(sessionToken))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Authentication required");
            return;
        }

        // Validate session token and get user
        var user = await ValidateSessionToken(sessionToken, dbContext);
        if (user == null)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Invalid or expired session");
            return;
        }

        // Add user info to context
        var claims = new[]
        {
            new Claim("UserId", user.Id.ToString()),
            new Claim("Email", user.Email),
            new Claim("Name", user.Name),
            new Claim("Role", user.Role)
        };

        var identity = new ClaimsIdentity(claims, "Session");
        context.User = new ClaimsPrincipal(identity);

        await _next(context);
    }

    private static bool IsPublicEndpoint(string? path)
    {
        if (string.IsNullOrEmpty(path)) return false;

        var publicPaths = new[]
        {
            "/api/auth/login",
            "/api/auth/register",
            "/health",
            "/swagger",
            "/swagger/index.html",
            "/swagger/v1/swagger.json"
        };

        return publicPaths.Any(publicPath => path.StartsWith(publicPath));
    }

    private static string? GetSessionToken(HttpContext context)
    {
        // Try Authorization header first (Bearer token)
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
        {
            return authHeader.Substring("Bearer ".Length).Trim();
        }

        // Fallback to custom header
        return context.Request.Headers["X-Session-Token"].FirstOrDefault();
    }

    private async Task<Models.User?> ValidateSessionToken(string sessionToken, InvestmentContext dbContext)
    {
        try
        {
            // Simple session token validation (format: session_{userId}_{timestamp})
            if (!sessionToken.StartsWith("session_"))
                return null;

            var parts = sessionToken.Split('_');
            if (parts.Length != 3)
                return null;

            if (!int.TryParse(parts[1], out int userId))
                return null;

            // Get user from database
            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return null;

            // In a production system, you would validate the timestamp and have proper session management
            // For now, we just check if the user exists
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating session token");
            return null;
        }
    }
}