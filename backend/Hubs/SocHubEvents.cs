namespace backend.Hubs;

/// <summary>
/// Alle SignalR-eventnamen op één plek. Een typfout geeft zo een compileerfout
/// in plaats van een event dat stil nooit aankomt. De frontend luistert op deze namen.
/// </summary>
public static class SocHubEvents
{
    public const string AlertReceived = "AlertReceived";  // US-05
    public const string AlertClosed   = "AlertClosed";    // US-07
    public const string AlertPromoted = "AlertPromoted";  // US-08
    public const string AlertLinked   = "AlertLinked";    // US-09
    public const string CaseCreated   = "CaseCreated";    // US-08
    public const string CaseClosed    = "CaseClosed";     // US-09
}
