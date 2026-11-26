namespace backend.Dtos.Authentication.Login;

/// <summary>An access token issued after both authentication factors are verified.</summary>
public sealed record LoginResponse(string Token);
