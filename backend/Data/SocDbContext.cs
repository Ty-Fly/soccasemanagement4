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
    public DbSet<TimelineEntry> TimelineEntries => Set<TimelineEntry>();
    public DbSet<HandoverItem> HandoverItems => Set<HandoverItem>();

    //US05: Voor het opslaan van IngestApiKeys per klant/tentant
    public DbSet<IngestApiKey> IngestApiKeys => Set<IngestApiKey>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Applies all configurations from the files in "Configurations" folder
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SocDbContext).Assembly);

        // US-02 (Kuray): e-mail is uniek. Max. 254 tekens, want SQL Server kan geen index op nvarchar(max) maken.
        modelBuilder.Entity<User>()
            .Property(user => user.Email)
            .HasMaxLength(254);
        modelBuilder.Entity<User>()
            .HasIndex(user => user.Email)
            .IsUnique();
        modelBuilder.Entity<User>()
            .Property(user => user.LastTwoFactorCounter)
            .HasDefaultValue(-1L);
    }
}