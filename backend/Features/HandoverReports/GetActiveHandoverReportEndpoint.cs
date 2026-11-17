using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Features.HandoverReports;

public static class GetActiveHandoverReportEndpoint
{
    public static void MapGetActiveHandoverReport(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/handover-reports/active-shift", async (SocDbContext db) =>
        {
            // Haal het meest recente rapport op inclusief items en gekoppelde cases
            var report = await db.HandoverReports
                .Include(r => r.Items)
                    .ThenInclude(i => i.LinkedCases)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            // Haal alle open cases op (alles wat niet de status 'Gesloten' heeft)
            var openCases = await db.Cases
                .Where(c => c.Status != Case.CaseStatus.Gesloten)
                .ToListAsync();

            return Results.Ok(new
            {
                Report = report,
                SuggestedOpenCases = openCases
            });
        })
        .RequireAuthorization();
    }
}