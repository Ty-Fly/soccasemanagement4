namespace backend.Features.Dev;

/// <summary>DEV ONLY: laat de claims uit je token zien. Handig om te testen.</summary>
public static class MeEndpoint
{
    public static IEndpointRouteBuilder MapMeEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/dev/me", (HttpContext http) =>
            Results.Ok(http.User.Claims.Select(c => new { c.Type, c.Value })))
        .RequireAuthorization()
        .WithTags("Dev")
        .WithSummary("DEV ONLY: toont de claims van de ingelogde gebruiker");

        return app;
    }
}
