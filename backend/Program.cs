using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Cookies;
using backend.Models;
using backend.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Creates the DB connection string from appsettings.json
var connectionString = builder.Configuration.GetConnectionString("Default") ??
    throw new InvalidOperationException("Connectionstring SQL is niet aanwezig. Check appsettings.json.");

// Adds database connection on the default connection string
builder.Services.AddDbContext<SocDbContext>(options =>
    options.UseSqlServer(connectionString));

// Adds the authentication packages to the runtime
// from: https://learn.microsoft.com/en-us/aspnet/core/security/authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme,
        options => builder.Configuration.Bind("JwtSettings", options))
    .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme,
        options => builder.Configuration.Bind("CookieSettings", options));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.Run();
