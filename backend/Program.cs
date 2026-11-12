using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Cookies;
using backend.Models;
using backend.Data;
using backend.Features.HandoverReports;
using backend.Hubs;
using backend.Features.Alerts;
using backend.Services.MultiTenancy;

var builder = WebApplication.CreateBuilder(args);

// OpenAPI & Swagger
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// SignalR voor realtime updates (< 5 sec, NFR-03)
builder.Services.AddSignalR();

// Multitenancy services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentTenant, CurrentTenant>();

// Database verbinding
var connectionString = builder.Configuration.GetConnectionString("Default") ??
    throw new InvalidOperationException("Connectionstring SQL is niet aanwezig. Check appsettings.json.");

builder.Services.AddDbContext<SocDbContext>(options =>
    options.UseSqlServer(connectionString));

// Authenticatie
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme,
        options => builder.Configuration.Bind("JwtSettings", options))
    .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme,
        options => builder.Configuration.Bind("CookieSettings", options));
// RBAC Policies (US-03)
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("EmployeeOnly", policy =>
        policy.RequireRole(
            nameof(User.UserRole.Analyst),
            nameof(User.UserRole.SecurityEngineer),
            nameof(User.UserRole.Manager),
            nameof(User.UserRole.AccountManager)));

    options.AddPolicy("RequireManager", policy =>
        policy.RequireRole(nameof(User.UserRole.Manager)));

    options.AddPolicy("ClientOnly", policy =>
        policy.RequireRole(nameof(User.UserRole.Client)));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Hubs
app.MapHub<SocHub>("/hubs/soc");

// Feature endpoints
app.MapCloseAlertEndpoint();
app.MapPromoteAlertEndpoint();
app.MapLinkAlertEndpoints();
app.MapGetHandoverReport();
app.MapCreateHandoverReport();

app.Run();