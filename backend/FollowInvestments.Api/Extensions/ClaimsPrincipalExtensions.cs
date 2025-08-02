using System.Security.Claims;

namespace FollowInvestments.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirst("UserId")?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : 0;
    }

    public static string GetUserEmail(this ClaimsPrincipal user)
    {
        return user.FindFirst("Email")?.Value ?? string.Empty;
    }

    public static string GetUserName(this ClaimsPrincipal user)
    {
        return user.FindFirst("Name")?.Value ?? string.Empty;
    }

    public static string GetUserRole(this ClaimsPrincipal user)
    {
        return user.FindFirst("Role")?.Value ?? "user";
    }

    public static bool IsAdmin(this ClaimsPrincipal user)
    {
        return user.GetUserRole().Equals("admin", StringComparison.OrdinalIgnoreCase);
    }
}