using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Features.HandoverReports;

public static class GetHandoverReportEndpoint
{
    public static void MapGetHandoverReport(this IEndpointRouteBuilder app)
    {
        // Register Endpoint
        app.MapGet("/api/handover-reports/latest", async (SocDbContext db) =>
        {
            var report = await db.HandoverReports
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            return report is not null ? Results.Ok(report) : Results.NotFound();
        })
        .RequireAuthorization("RequireManager"); // RBAC-check
    }
}