namespace PatchHub.Infrastructure.Domain;
public class SteamAppPopular : SteamApp
{
    public int PeakCount { get; init; }

    public int CurrentCount { get; init; }
}
