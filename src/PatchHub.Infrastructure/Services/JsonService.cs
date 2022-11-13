using System.Text.Json;
using PatchHub.Infrastructure.Models;

namespace PatchHub.Infrastructure.Services;

public class JsonService
{
	private readonly string _steamAppIdJsonPath;

	public IEnumerable<App> SteamAppIds { get; private set; } = Enumerable.Empty<App>();

	public JsonService(string path)
	{
		_steamAppIdJsonPath = path;
	}

	public async Task CreateSteamAppIdModelAsync()
	{
		using FileStream stream = File.OpenRead(_steamAppIdJsonPath);
		AppNameIDJsonModel? steamAppIdModel = await JsonSerializer.DeserializeAsync<AppNameIDJsonModel>(stream);
		SteamAppIds = steamAppIdModel!.response.apps;
	}
}
