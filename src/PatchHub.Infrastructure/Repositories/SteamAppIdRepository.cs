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
			.Where(x => x.name.StartsWith(searchInput, StringComparison.OrdinalIgnoreCase))
			.OrderBy(x => x.name.Length)
			.ToSteamApps();
		return response;
	}
}
