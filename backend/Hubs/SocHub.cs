using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs;

[Authorize]
public sealed class SocHub : Hub
{
    public const string EmployeesGroup = "employees";

    public override async Task OnConnectedAsync()
    {
        if (Context.User is not null && !Context.User.IsInRole("Client"))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, EmployeesGroup);
        }

        await base.OnConnectedAsync();
    }
}