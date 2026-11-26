using System.Text;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
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
using backend.Features.Cases;
using backend.Services.Ingest;
using backend.Features.Authentication;
using backend.Services.Authentication;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

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

    // US-xx: tweede "Authorize"-veld voor de API-key van externe bronnen
    options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Name = IngestApiKeyHandler.HeaderName,
        Description = "Voor /api/ingest. In Development: dev-ingest-klant-a of dev-ingest-klant-b."
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("ApiKey", document)] = []
    });
});

// US-02 (Kuray): validatie van de login-DTO's en nette foutmeldingen
builder.Services.AddValidation();
builder.Services.AddProblemDetails();

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

// US-xx: ingest van alerts uit externe bronnen
builder.Services.AddScoped<IIngestService, IngestService>();

// US-xx: CORS voor de frontend. SignalR vanuit de browser vereist een vaste origin + AllowCredentials
// (een wildcard * is niet toegestaan). Origin instelbaar via "Frontend:Origin" in appsettings.
var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? "http://localhost:5173";
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy => policy
    .WithOrigins(frontendOrigin)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// Database verbinding
var connectionString = builder.Configuration.GetConnectionString("Default") ??
    throw new InvalidOperationException("Connectionstring SQL is niet aanwezig. Check appsettings.json.");

builder.Services.AddDbContext<SocDbContext>(options =>
    options.UseSqlServer(connectionString));

// Authenticatie: controleert JWT-tokens, zodat RequireAuthorization werkt.
// De echte login (wachtwoord + 2FA, tokens uitgeven) is US-02.
var jwtSigningKey = builder.Configuration["JwtSettings:SigningKey"] ?? "";

// US-02 (Kuray): login met wachtwoord + TOTP. Zelfde issuer, audience en sleutel als de
// tokenvalidatie hieronder, zodat tokens van /api/login en /api/dev/token allebei geldig zijn.
builder.Services.AddSingleton(new JwtSettings
{
    Issuer = builder.Configuration["JwtSettings:Issuer"] ?? "",
    Audience = builder.Configuration["JwtSettings:Audience"] ?? "",
    SigningKey = jwtSigningKey.PadRight(32)
});
builder.Services.AddSingleton<JwtTokenGenerator>();
builder.Services.AddScoped<TotpAuthenticator>();
builder.Services.AddDataProtection();

// US-02: maximaal 10 login-/registratiepogingen per minuut per IP-adres
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
    })
    // US-xx: tweede scheme voor externe bronnen (header X-Api-Key). JWT blijft de standaard.
    .AddScheme<AuthenticationSchemeOptions, IngestApiKeyHandler>(IngestApiKeyHandler.SchemeName, _ => { });

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

    // US-xx: alleen API-keys, en alleen op ingest-endpoints.
    // Een JWT werkt hier niet, en een API-key werkt nergens anders.
    options.AddPolicy("IngestOnly", policy => policy
        .AddAuthenticationSchemes(IngestApiKeyHandler.SchemeName)
        .RequireRole(IngestApiKeyHandler.Role));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();

    // US-xx: dev-testpagina voor SignalR op /dev/signalr-test.html
    app.UseStaticFiles();

    // Database bijwerken en (als die leeg is) testdata toevoegen
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<SocDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        await DevDataSeeder.SeedAsync(db);
        await DevDataSeeder.SeedIngestKeysAsync(db);   // US-xx
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database bijwerken/seeden mislukt. Draait SQL Server en klopt de connectionstring?");
    }
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("Frontend");   // US-xx: vóór authenticatie
app.UseRateLimiter();      // US-02: na routing, zodat de policy per endpoint werkt
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
app.MapCreateHandoverReport();
app.MapCreateHandoverItem();          // US-22
app.MapGetActiveHandoverReport();     // US-22/23
app.MapAssignCaseEndpoints();         // US-11
app.MapCreateNationalIncidentEndpoint(); // US-10
app.MapRegisterUserEndpoint();        // US-02
app.MapVerifyRegistrationEndpoint();  // US-02
app.MapLoginUserEndpoint();           // US-02
app.MapIngestAlertEndpoint();         // US-05
app.MapGetAlertsEndpoint();           // US-06

app.Run();