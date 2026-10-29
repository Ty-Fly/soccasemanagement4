using System.Security.Claims;

namespace backend.Services.MultiTenancy;

public sealed class CurrentTenant(IHttpContextAccessor http) : ICurrentTenant
{
    /** 
     * Grabs the current user from the HTTP context/token.
     * Has to be nullable because the HTTP context requires nullable context.
     */
    private ClaimsPrincipal? User => http.HttpContext?.User;

    // Checks if the current user is authenticated and not a client.
    public bool IsEmployee => User?.Identity?.IsAuthenticated == true
        && !User.IsInRole(nameof(Models.User.UserRole.Client));

    /** 
     * Retrieves the tenant ID from the user's token. 
     * Throws an exception if the tenant ID is invalid or not present.
     * Ensures that the tenant doesn't accidentally access another tenant's data.
     */
    public int TenantId
    {
        get
        {
            if (int.TryParse(User?.FindFirstValue("tenant_id"), out int id) && id > 0)
                return id;

            throw new UnauthorizedAccessException("Invalid tenant.");
        }
    }

    // Checks if the provided (parameter) tenant ID matches the current user's tenant ID.
    // Also makes sure the tenant ID is greater than 0 to not allow access to invalid integers.
    public bool HasTenantAccess(int tenantId)
    {
        return tenantId > 0 && tenantId == TenantId;
    }
}
