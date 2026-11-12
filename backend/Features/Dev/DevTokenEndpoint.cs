using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using backend.Data;

namespace backend.Features.Dev;

/// <summary>
/// ALLEEN IN DEVELOPMENT: haal een JWT op voor een testgebruiker, zonder wachtwoord en 2FA.
/// Zo kan iedereen zijn endpoints testen voordat de echte login (US-02, Kuray) klaar is.
/// In Swagger: roep dit aan, kopieer "token" en plak het bij "Authorize".
/// </summary>
public static class DevTokenEndpoint
{
    public sealed record DevTokenRequest(string Email);
    public sealed record DevTokenResponse(string Token, int UserId, string Role, int TenantId);

    public static IEndpointRouteBuilder MapDevTokenEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/dev/token", async (DevTokenRequest request, SocDbContext db, IConfiguration config) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user is null) return Results.NotFound();

            // Dezelfde claimnamen die CurrentTenant en de policies verwachten
            var claims = new List<Claim>
            {
                new("sub", user.Id.ToString()),
                new("name", user.Name),
                new("role", user.Role.ToString()),
                new("tenant_id", user.TenantId.ToString())
            };

            var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
            {
                Issuer = config["JwtSettings:Issuer"],
                Audience = config["JwtSettings:Audience"],
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(8),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["JwtSettings:SigningKey"]!)),
                    SecurityAlgorithms.HmacSha256)
            });

            return Results.Ok(new DevTokenResponse(token, user.Id, user.Role.ToString(), user.TenantId));
        })
        .AllowAnonymous()
        .WithTags("Dev")
        .WithSummary("DEV ONLY: token voor een testgebruiker (bijv. analist@soc.local)");

        return app;
    }
}
