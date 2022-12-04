using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Mapping;
using PatchHub.Infrastructure.Models;
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
		var steamAppIds = await GetSteamAppsAsync();
		var response = steamAppIds
			.Where(x => x.name.Contains(searchInput, StringComparison.OrdinalIgnoreCase))
			.ToSteamApps();
		return response;
	}

	public async Task<SteamApp> GetSteamAppFromIdAsync(int appId)
	{
		var steamAppIds = await GetSteamAppsAsync();
		var match = steamAppIds.FirstOrDefault(x => x.appid == appId);
		if (match == null)
		{
			return new SteamApp();
		}
		return match.ToSteamApp();
	}

	private async Task<IEnumerable<App>> GetSteamAppsAsync()
	{
		if (!_jsonService.SteamAppIds.Any())
		{
			await _jsonService.CreateSteamAppIdModelAsync();
		}
		return await _jsonService.GetSteamAppIdsAsync();
	}
}
