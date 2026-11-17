using System.Text;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using backend.Models;
using backend.Data;
using backend.Data.Seed;
using backend.Features.Dev;
using backend.Services.Timeline;
using backend.Features.HandoverReports;
using backend.Hubs;
using backend.Features.Alerts;
using backend.Services.MultiTenancy;

var builder = WebApplication.CreateBuilder(args);

// OpenAPI & Swagger
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // "Authorize"-knop in Swagger om een token te plakken
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Plak hier het token. In Development: haal er een op via POST /api/dev/token."
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

// Enums als tekst in JSON ("Containment" i.p.v. 1)
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// SignalR voor realtime updates (< 5 sec, NFR-03)
builder.Services.AddSignalR();

// Multitenancy services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentTenant, CurrentTenant>();

// Gedeelde tijdlijn voor cases
builder.Services.AddScoped<ITimelineService, TimelineService>();

// Database verbinding
var connectionString = builder.Configuration.GetConnectionString("Default") ??
    throw new InvalidOperationException("Connectionstring SQL is niet aanwezig. Check appsettings.json.");

builder.Services.AddDbContext<SocDbContext>(options =>
    options.UseSqlServer(connectionString));

// Authenticatie: controleert JWT-tokens, zodat RequireAuthorization werkt.
// De echte login (wachtwoord + 2FA, tokens uitgeven) is US-02.
var jwtSigningKey = builder.Configuration["JwtSettings:SigningKey"] ?? "";
if (jwtSigningKey.Length < 32 && !EF.IsDesignTime)
    throw new InvalidOperationException("JwtSettings:SigningKey ontbreekt of is korter dan 32 tekens. Check appsettings.Development.json.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Claimnamen houden zoals ze in het token staan ("sub", "role", "tenant_id")
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey.PadRight(32))),
            NameClaimType = "name",
            RoleClaimType = "role"
        };

        // SignalR stuurt het token via de querystring mee (?access_token=...)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;

                return Task.CompletedTask;
            }
        };
    });

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

    // Database bijwerken en (als die leeg is) testdata toevoegen
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<SocDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        await DevDataSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database bijwerken/seeden mislukt. Draait SQL Server en klopt de connectionstring?");
    }
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Hubs
app.MapHub<SocHub>("/hubs/soc");

// Dev-hulp (alleen Development)
if (app.Environment.IsDevelopment())
{
    app.MapDevTokenEndpoint();
    app.MapMeEndpoint();
}

// Feature endpoints
app.MapCloseAlertEndpoint();
app.MapPromoteAlertEndpoint();
app.MapLinkAlertEndpoints();
app.MapGetHandoverReport();
app.MapCreateHandoverReport();

app.Run();