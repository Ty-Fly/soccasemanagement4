using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using backend.Models;

namespace backend.Data.Configurations;

public sealed class IngestApiKeyConfiguration : IEntityTypeConfiguration<IngestApiKey>
{
    public void Configure(EntityTypeBuilder<IngestApiKey> builder)
    {
        builder.Property(k => k.Name).HasMaxLength(100);
        builder.Property(k => k.KeyHash).HasMaxLength(64); // SHA-256 in hex = 64 tekens

        // Opzoeken gaat via de hash, en twee keys met dezelfde hash mogen niet bestaan
        builder.HasIndex(k => k.KeyHash).IsUnique();

        // Een key moet bij een bestaande klant horen
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(k => k.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}