using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public sealed class SocDbContext : DbContext
{
    public SocDbContext(DbContextOptions<SocDbContext> options) : base(options)
    {
    }

    // Setting up DB Tables
    public DbSet<Case> Cases => Set<Case>();
    public DbSet<Observable> Observables => Set<Observable>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();

    public DbSet<HandoverReport> HandoverReports => Set<HandoverReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Applies all configurations from the files in "Configurations" folder
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SocDbContext).Assembly);
        modelBuilder.Entity<User>()
            .HasIndex(user => user.Email)
            .IsUnique();
        modelBuilder.Entity<User>()
            .Property(user => user.LastTwoFactorCounter)
            .HasDefaultValue(-1L);
    }
}