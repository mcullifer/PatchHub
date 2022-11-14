using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Mapping;
using PatchHub.Infrastructure.Services;

namespace PatchHub.Infrastructure.Repositories;

public class SteamAppIdRepository
{
	private readonly JsonService _jsonService;

	public SteamAppIdRepository(JsonService jsonService)
	{
		_jsonService = jsonService;
	}

	public async Task InitializeAsync()
	{
		await _jsonService.CreateSteamAppIdModelAsync();
	}

	public async Task<SteamApps> GetSteamAppsAsync(string searchInput)
	{
		await _jsonService.CreateSteamAppIdModelAsync();
		var response = _jsonService.SteamAppIds
			.Where(x => x.name.Contains(searchInput, StringComparison.OrdinalIgnoreCase))
			.ToSteamApps();
		return response;
	}

	public async Task<SteamApp> GetSteamAppFromIdAsync(int appId)
	{
		await _jsonService.CreateSteamAppIdModelAsync();
		var match = _jsonService.SteamAppIds.FirstOrDefault(x => x.appid == appId);
		if (match == null)
		{
			return new SteamApp();
		}
		return match.ToSteamApp();
	}
}
