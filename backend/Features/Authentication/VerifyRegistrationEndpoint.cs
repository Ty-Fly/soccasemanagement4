using System.Text;
using backend.Data;
using backend.Dtos.Authentication.Register;
using backend.Services.Authentication;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Authentication;

public static class VerifyRegistrationEndpoint
{
    public static void MapVerifyRegistrationEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/register/verify", async Task<Results<NoContent, UnauthorizedHttpResult>> (
            VerifyRegistrationRequest request,
            SocDbContext db,
            TotpAuthenticator totp,
            CancellationToken cancellationToken) =>
        {
            if (Encoding.UTF8.GetByteCount(request.Password) > 72)
            {
                return TypedResults.Unauthorized();
            }

            var email = AuthenticationEndpointHelpers.NormalizeEmail(request.Email);
            var user = await db.Users.SingleOrDefaultAsync(
                candidate => candidate.Email == email,
                cancellationToken);

            if (user is null
                || user.TwoFactorEnabled
                || user.TwoFactorSecretProtected is null
                || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return TypedResults.Unauthorized();
            }

            var secret = totp.Unprotect(user.TwoFactorSecretProtected);
            var counter = totp.FindMatchingCounter(secret, request.Code);
            if (counter is null)
            {
                return TypedResults.Unauthorized();
            }

            var updated = await db.Users
                .Where(candidate => candidate.Id == user.Id
                    && !candidate.TwoFactorEnabled
                    && candidate.LastTwoFactorCounter < counter.Value)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(candidate => candidate.TwoFactorEnabled, true)
                        .SetProperty(candidate => candidate.LastTwoFactorCounter, counter.Value),
                    cancellationToken);

            return updated == 1
                ? TypedResults.NoContent()
                : TypedResults.Unauthorized();
        })
        .WithName("VerifyRegistration")
        .WithSummary("Confirm authenticator setup")
        .WithDescription("Enables two-factor authentication after verifying the password and authenticator code.")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .RequireRateLimiting("authentication");
    }
}
