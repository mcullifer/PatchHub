namespace PatchHub.Infrastructure.Domain;

public class SteamApps
{
    public IEnumerable<SteamApp> Apps { get; init; } = Enumerable.Empty<SteamApp>();
}