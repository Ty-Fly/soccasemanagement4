using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using backend.Models;

namespace backend.Data.Configurations;

public sealed class CaseConfiguration : IEntityTypeConfiguration<Case>
{
    public void Configure(EntityTypeBuilder<Case> builder)
    {
        // Status als leesbare tekst in de database ("Containment")
        builder.Property(c => c.Status)
            .HasConversion<string>()
            .HasMaxLength(32);

        builder.HasOne(c => c.AssignedToUser)
            .WithMany()
            .HasForeignKey(c => c.AssignedToUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
