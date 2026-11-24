using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;
using backend.Models;
using backend.Data;
using backend.Features.HandoverReports;
using backend.Hubs;
using backend.Features.Alerts;
using backend.Services.MultiTenancy;
using backend.Features.Authentication;
using backend.Services.Authentication;

var builder = WebApplication.CreateBuilder(args);

// OpenAPI & Swagger
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddValidation();
builder.Services.AddProblemDetails();

var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? throw new InvalidOperationException("JwtSettings configuration is required.");
jwtSettings.Validate();
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<JwtTokenGenerator>();
builder.Services.AddScoped<TotpAuthenticator>();
builder.Services.AddDataProtection();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("authentication", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

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
        options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    System.Text.Encoding.UTF8.GetBytes(jwtSettings.SigningKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };
        })
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

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseRateLimiter();
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
app.MapRegisterUserEndpoint();
app.MapVerifyRegistrationEndpoint();
app.MapLoginUserEndpoint();

app.Run();