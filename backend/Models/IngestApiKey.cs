namespace backend.Models;

/// <summary>
/// US-05: identiteit van een externe bron (SIEM/EDR) die alerts mag insturen.
/// Eén key hoort bij precies één klant: de key bepaalt de TenantId van de alert.
/// We bewaren alleen de hash, nooit de key zelf.
/// </summary>
/// 
public sealed class IngestApiKey
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public required string Name { get; set; }     // bijv. "Sentinel Klant A", wordt Alert.Source
    public required string KeyHash { get; set; }  // SHA-256, hex
    public bool IsActive { get; set; } = true;    // uitzetten bij een gelekte key
    public DateTime CreatedAt { get; set; }
}