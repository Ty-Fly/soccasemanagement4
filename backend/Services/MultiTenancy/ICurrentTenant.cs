namespace backend.Services.MultiTenancy;

public interface ICurrentTenant
{
    int TenantId { get; }

    /**
     * Indicates whether the current user is an employee or not,
     * so that clients cannot access data from employees.
     */
    bool IsEmployee { get; }

    bool HasTenantAccess(int tenantId);
}
