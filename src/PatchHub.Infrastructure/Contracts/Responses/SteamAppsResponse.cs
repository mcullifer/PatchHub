namespace PatchHub.Infrastructure.Contracts.Responses;

public class SteamAppsResponse
{
	public IEnumerable<SteamAppResponse> SteamApps { get; init; } = Enumerable.Empty<SteamAppResponse>();
}