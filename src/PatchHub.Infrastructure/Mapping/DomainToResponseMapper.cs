using PatchHub.Infrastructure.Contracts.Responses;
using PatchHub.Infrastructure.Models;

namespace PatchHub.Infrastructure.Mapping;

public static class DomainToResponseMapper
{
	public static SteamAppResponse ToSteamAppResponse(this App app)
	{
		return new SteamAppResponse
		{
			AppID = app.appid,
			AppName = app.name
		};
	}

	public static SteamAppsResponse ToSteamAppsResponse(this IEnumerable<App> apps)
	{
		return new SteamAppsResponse
		{
			SteamApps = apps.Select(x => x.ToSteamAppResponse())
		};
	}
}
