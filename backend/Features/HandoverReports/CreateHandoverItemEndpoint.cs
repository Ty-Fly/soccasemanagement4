using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Features.HandoverReports;

// Wat de frontend meestuurt bij het aanmaken van een item
public record CreateHandoverItemRequest(
    HandoverItemCategory Category,
    string Text,
    int? ClientId
);

public static class CreateHandoverItemEndpoint
{
    public static void MapCreateHandoverItem(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/handover-reports/{reportId}/items", async (int reportId, CreateHandoverItemRequest request, SocDbContext db, HttpContext httpContext) =>
        {
            // Controleer of het rapport bestaat binnen de tenant van de ingelogde gebruiker
            var report = await db.HandoverReports.FindAsync(reportId);
            if (report is null)
            {
                return Results.NotFound(new { message = "Overdrachtsrapport niet gevonden." });
            }

            // Haal de naam van de auteur op uit de JWT claims (gezet door DevTokenEndpoint of echte login)
            var authorName = httpContext.User.FindFirstValue("name") 
                             ?? httpContext.User.FindFirstValue(ClaimTypes.Name) 
                             ?? "SOC Analist";

            // Maak het item aan met UTC tijdstip
            var item = new HandoverItem
            {
                HandoverReportId = reportId,
                Category = request.Category,
                Text = request.Text,
                Author = authorName,
                CreatedAt = DateTime.UtcNow,
                ClientId = request.ClientId
            };

            db.HandoverItems.Add(item);
            await db.SaveChangesAsync();

            return Results.Created($"/api/handover-reports/{reportId}/items/{item.Id}", item);
        })
        .RequireAuthorization() // Zorgt dat je ingelogd moet zijn (via de Dev-token of echte token)
        .WithTags("Handover Reports");
    }
}