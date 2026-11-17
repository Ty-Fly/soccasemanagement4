using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using backend.Data;
using backend.Models;

namespace backend.Features.HandoverReports;

public static class CreateHandoverReportEndpoint
{
    public static void MapCreateHandoverReport(this IEndpointRouteBuilder app)
    {
        // Register Endpoint
        app.MapPost("/api/handover-reports", async (HandoverReport report, SocDbContext db) =>
        {
            // Save time in UTC
            report.CreatedAt = DateTime.UtcNow; 
            
            db.HandoverReports.Add(report);
            await db.SaveChangesAsync();

            return Results.Created($"/api/handover-reports/{report.Id}", report);
        })
        .RequireAuthorization("RequireManager"); // RBAC-check
    }
}