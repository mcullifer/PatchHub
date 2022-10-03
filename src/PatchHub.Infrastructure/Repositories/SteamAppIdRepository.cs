using PatchHub.Infrastructure.Contracts.Responses;
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

	public async Task<IEnumerable<SteamAppResponse>> GetSteamAppsAsync(string searchInput)
	{
		await _jsonService.CreateSteamAppIdModelAsync();
		var response = _jsonService.SteamAppIds.Select(x => x.ToSteamAppResponse())
			.Where(x => x.AppName.StartsWith(searchInput, StringComparison.OrdinalIgnoreCase))
			.OrderBy(x => x.AppName.Length);
		return response;
	}
}
