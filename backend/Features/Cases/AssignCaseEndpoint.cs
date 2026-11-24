using System.Security.Claims;
using backend.Data;
using backend.Hubs;
using backend.Models;
using backend.Services.Timeline;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Cases;

public static class AssignCaseEndpoint
{
    public sealed record AssignRequest(int UserId);

    public static void MapAssignCaseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cases").RequireAuthorization("EmployeeOnly").WithTags("Cases");

        // AC 1 & AC 2: Onverdeelde case oppakken door de ingelogde analist
        group.MapPatch("/{id:int}/claim", async (
            int id,
            ClaimsPrincipal user,
            SocDbContext db,
            ITimelineService timeline,
            IHubContext<SocHub> hub) =>
        {
            var currentUserId = GetUserId(user);
            if (currentUserId is null) return Results.Unauthorized();

            var targetCase = await db.Cases.FirstOrDefaultAsync(c => c.Id == id);
            if (targetCase is null) return Results.NotFound();
            if (targetCase.Status == Case.CaseStatus.Gesloten) return Results.Conflict("Gesloten case kan niet worden opgepakt.");
            if (targetCase.AssignedToUserId is not null) return Results.Conflict("Case is al toegewezen aan een behandelaar.");

            var assignee = await db.Users.FindAsync(currentUserId.Value);
            if (assignee is null) return Results.NotFound("Gebruiker niet gevonden.");

            targetCase.AssignedToUserId = assignee.Id;

            // AC 2: Wisseling van behandelaar in de tijdlijn
            timeline.Add(
                targetCase,
                TimelineEntry.EntryType.AssigneeChange,
                $"Case opgepakt door {assignee.Name}.",
                authorUserId: assignee.Id);

            await db.SaveChangesAsync();

            // AC 1: Binnen 5 seconden zichtbaar voor alle SOC-medewerkers
            await hub.Clients.Group(SocHub.EmployeesGroup).SendAsync("CaseAssigned", new
            {
                caseId = targetCase.Id,
                assignedToUserId = assignee.Id,
                assignedToName = assignee.Name
            });

            return Results.Ok(new { targetCase.Id, targetCase.AssignedToUserId, AssignedToName = assignee.Name });
        }).WithSummary("Pakt een onverdeelde case op voor de ingelogde SOC-analist (US-11)");

        // AC 1 & AC 2: Case overdragen aan een collega
        group.MapPatch("/{id:int}/assign", async (
            int id,
            AssignRequest req,
            ClaimsPrincipal user,
            SocDbContext db,
            ITimelineService timeline,
            IHubContext<SocHub> hub) =>
        {
            var targetCase = await db.Cases.FirstOrDefaultAsync(c => c.Id == id);
            if (targetCase is null) return Results.NotFound();
            if (targetCase.Status == Case.CaseStatus.Gesloten) return Results.Conflict("Gesloten case kan niet worden overgedragen.");

            var newAssignee = await db.Users.FindAsync(req.UserId);
            if (newAssignee is null) return Results.NotFound("Collega niet gevonden.");
            if (newAssignee.Role == User.UserRole.Client) return Results.BadRequest("Een case kan niet aan een klant worden toegewezen.");

            var currentUserId = GetUserId(user);
            targetCase.AssignedToUserId = newAssignee.Id;

            // AC 2: Wisseling van behandelaar in de tijdlijn
            timeline.Add(
                targetCase,
                TimelineEntry.EntryType.AssigneeChange,
                $"Case overgedragen aan {newAssignee.Name}.",
                authorUserId: currentUserId);

            await db.SaveChangesAsync();

            // AC 1: Binnen 5 seconden zichtbaar voor alle SOC-medewerkers
            await hub.Clients.Group(SocHub.EmployeesGroup).SendAsync("CaseAssigned", new
            {
                caseId = targetCase.Id,
                assignedToUserId = newAssignee.Id,
                assignedToName = newAssignee.Name
            });

            return Results.Ok(new { targetCase.Id, targetCase.AssignedToUserId, AssignedToName = newAssignee.Name });
        }).WithSummary("Draagt een case over aan een collega (US-11)");
    }

    private static int? GetUserId(ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub"), out var id)
            ? id
            : null;
}