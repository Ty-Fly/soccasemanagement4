using System.Text;
using backend.Data;
using backend.Dtos.Authentication.Login;
using backend.Services.Authentication;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Authentication;

public static class LoginUserEndpoint
{
    public static void MapLoginUserEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/login", async Task<Results<Ok<LoginResponse>, UnauthorizedHttpResult>> (
            LoginRequest request,
            SocDbContext db,
            TotpAuthenticator totp,
            JwtTokenGenerator tokenGenerator,
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
                || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)
                || !user.TwoFactorEnabled
                || user.TwoFactorSecretProtected is null)
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
                    && candidate.TwoFactorEnabled
                    && candidate.LastTwoFactorCounter < counter.Value)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(candidate => candidate.LastTwoFactorCounter, counter.Value),
                    cancellationToken);

            if (updated != 1)
            {
                return TypedResults.Unauthorized();
            }

            return TypedResults.Ok(new LoginResponse(tokenGenerator.GenerateToken(user)));
        })
        .WithName("LoginUser")
        .WithSummary("Log in with a password and authenticator code")
        .WithDescription("Issues an access token only after both the password and a fresh TOTP code are verified.")
        .Produces<LoginResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .RequireRateLimiting("authentication");
    }
}
