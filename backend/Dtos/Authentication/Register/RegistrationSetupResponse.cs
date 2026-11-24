namespace backend.Dtos.Authentication.Register;

/// <summary>Authenticator setup information for a pending account.</summary>
public sealed record RegistrationSetupResponse(string Secret, string ProvisioningUri);
