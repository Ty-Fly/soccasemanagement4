using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using backend.Models;

namespace backend.Data.Configurations;

public sealed class TimelineEntryConfiguration : IEntityTypeConfiguration<TimelineEntry>
{
    public void Configure(EntityTypeBuilder<TimelineEntry> builder)
    {
        builder.Property(t => t.Type)
            .HasConversion<string>()
            .HasMaxLength(32);

        builder.Property(t => t.Content).HasColumnType("nvarchar(max)");

        builder.HasOne(t => t.Case)
            .WithMany(c => c.TimelineEntries)
            .HasForeignKey(t => t.CaseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.AuthorUser)
            .WithMany()
            .HasForeignKey(t => t.AuthorUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => new { t.CaseId, t.CreatedAt });
    }
}
