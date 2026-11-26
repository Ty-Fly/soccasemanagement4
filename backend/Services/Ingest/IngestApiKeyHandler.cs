using System.Security.Claims;
using System.Text.Encodings.Web;
using backend.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services.Ingest;

/// <summary>
/// US-xx: authenticeert externe bronnen met de header X-Api-Key.
/// Zet dezelfde claimnamen als de JWT ("sub", "name", "role", "tenant_id"),
/// zodat ICurrentTenant en de policies gewoon werken.
/// </summary>
public sealed class IngestApiKeyHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    SocDbContext db)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "IngestApiKey";
    public const string HeaderName = "X-Api-Key";
    public const string Role = "IngestSource";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Geen header: dit scheme is niet van toepassing (dat wordt een 401 via de policy)
        if (!Request.Headers.TryGetValue(HeaderName, out var rawKey) || string.IsNullOrWhiteSpace(rawKey))
            return AuthenticateResult.NoResult();

        var hash = ApiKeyHasher.Hash(rawKey.ToString());

        var key = await db.IngestApiKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.KeyHash == hash && k.IsActive, Context.RequestAborted);

        if (key is null)
            return AuthenticateResult.Fail("Ongeldige of ingetrokken API-key.");

        var claims = new[]
        {
            new Claim("sub", $"ingest:{key.Id}"),
            new Claim("name", key.Name),
            new Claim("role", Role),
            new Claim("tenant_id", key.TenantId.ToString())   // de klant komt UIT DE KEY
        };

        var identity = new ClaimsIdentity(claims, SchemeName, nameType: "name", roleType: "role");
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return AuthenticateResult.Success(ticket);
    }
}
