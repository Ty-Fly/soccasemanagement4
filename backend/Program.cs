using Microsoft.EntityFrameworkCore;
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
