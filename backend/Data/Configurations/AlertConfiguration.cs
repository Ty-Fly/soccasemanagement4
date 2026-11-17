using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using backend.Models;

namespace backend.Data.Configurations;

public sealed class AlertConfiguration : IEntityTypeConfiguration<Alert>
{
    public void Configure(EntityTypeBuilder<Alert> builder)
    {
        builder.Property(a => a.Status)
            .HasConversion<string>()
            .HasMaxLength(32);

        builder.HasOne(a => a.ClosedByUser)
            .WithMany()
            .HasForeignKey(a => a.ClosedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Case)
            .WithMany(c => c.Alerts)
            .HasForeignKey(a => a.CaseId)
            .OnDelete(DeleteBehavior.Restrict);


        // US-05: ingest-velden
        builder.Property(a => a.Severity)
            .HasConversion<string>()
            .HasMaxLength(16);

        // Max-lengtes zijn nodig: een kolom van type nvarchar(max) kan niet in een index
        builder.Property(a => a.Source).HasMaxLength(100);
        builder.Property(a => a.ExternalId).HasMaxLength(200);

        // Dezelfde alert van dezelfde bron bij dezelfde klant mag maar één keer bestaan.
        // De database bewaakt dit, ook als twee requests tegelijk binnenkomen.
        builder.HasIndex(a => new { a.TenantId, a.Source, a.ExternalId })
            .IsUnique()
            .HasFilter("[ExternalId] IS NOT NULL");
    }
}