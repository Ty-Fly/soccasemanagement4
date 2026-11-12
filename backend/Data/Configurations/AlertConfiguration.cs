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
    }
}