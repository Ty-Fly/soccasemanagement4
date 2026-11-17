using backend.Data;
using backend.Models;
using backend.Services.Authentication;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Authentication;

public static class LoginUserEndpoint
{
    public sealed record LoginRequest(string Email, string Password);

    public static void MapLoginUser(this IEndpointRouteBuilder app)
    {
        // Register Endpoint
        app.MapPost("/api/login", async (LoginRequest request, SocDbContext db) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            // Generate JWT token
            var token = JwtTokenGenerator.GenerateToken(user);

            return Results.Ok(new { Token = token });
        });
    }
}
