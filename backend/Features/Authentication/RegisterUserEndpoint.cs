using System.Text;
using backend.Data;
using backend.Dtos.Authentication.Register;
using backend.Services.Authentication;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Authentication;

public static class RegisterUserEndpoint
{
    private const string TotpIssuer = "SOC Case Management";

    public static void MapRegisterUserEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/register", async Task<Results<Accepted<RegistrationSetupResponse>, BadRequest<ProblemDetails>, Conflict<ProblemDetails>, UnauthorizedHttpResult>> (
            RegisterRequest request,
            SocDbContext db,
            TotpAuthenticator totp,
            CancellationToken cancellationToken) =>
        {
            if (Encoding.UTF8.GetByteCount(request.Password) > 72)
            {
                return TypedResults.BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Invalid password",
                    Detail = "Password must be no more than 72 UTF-8 bytes."
                });
            }

            // Cleans up email (NFR-01) and looks up the user in the database
            var email = AuthenticationEndpointHelpers.NormalizeEmail(request.Email);
            var user = await db.Users.SingleOrDefaultAsync(
                user => user.Email == email,
                cancellationToken);

            if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return TypedResults.Unauthorized();
            }

            if (user.TwoFactorEnabled)
            {
                return TypedResults.Conflict(new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Two-factor authentication is already enabled."
                });
            }

            // If the user has a TOTP secret, unprotect it; otherwise, create a new one
            var secret = user.TwoFactorSecretProtected is null
                ? totp.CreateSecret()
                : totp.Unprotect(user.TwoFactorSecretProtected);

            /// If the user does not have a TOTP secret, protect and store it in the database
            if (user.TwoFactorSecretProtected is null)
            {
                var updated = await db.Users
                    .Where(candidate => candidate.Id == user.Id
                        && !candidate.TwoFactorEnabled
                        && candidate.TwoFactorSecretProtected == null)
                    .ExecuteUpdateAsync(
                        setters => setters.SetProperty(
                            candidate => candidate.TwoFactorSecretProtected,
                            totp.Protect(secret)),
                        cancellationToken);

                if (updated != 1)
                {
                    var latestUser = await db.Users
                        .AsNoTracking()
                        .SingleOrDefaultAsync(candidate => candidate.Id == user.Id, cancellationToken);

                    if (latestUser is null
                        || latestUser.TwoFactorEnabled
                        || latestUser.TwoFactorSecretProtected is null)
                    {
                        return TypedResults.Conflict(new ProblemDetails
                        {
                            Status = StatusCodes.Status409Conflict,
                            Title = "Two-factor setup could not be started."
                        });
                    }

                    secret = totp.Unprotect(latestUser.TwoFactorSecretProtected);
                }
            }

            return TypedResults.Accepted(
                "/api/register/verify",
                CreateSetupResponse(user.Email, secret));
        })
        .WithName("RegisterUser")
        .WithSummary("Begin authenticator setup for a pre-provisioned account")
        .WithDescription("Requires an account created by an administrator. Returns a TOTP secret and provisioning URI; confirm setup before logging in.")
        .Produces<RegistrationSetupResponse>(StatusCodes.Status202Accepted)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status409Conflict)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .RequireRateLimiting("authentication");
    }

    private static RegistrationSetupResponse CreateSetupResponse(string email, string secret)
    {
        var label = Uri.EscapeDataString($"{TotpIssuer}:{email}");
        var issuer = Uri.EscapeDataString(TotpIssuer);
        var uri = $"otpauth://totp/{label}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30";
        return new RegistrationSetupResponse(secret, uri);
    }
}
