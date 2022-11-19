namespace PatchHub.Infrastructure.Domain;
public class SteamAppPopular
{
    public int PeakCount { get; init; }

    public int CurrentCount { get; init; }

    public int AppId { get; set; }

    public string AppName { get; set; }
}
