using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using PatchHub.Infrastructure.Repositories;
using PatchHub.Infrastructure.Services;
using PatchHub.Parsers;

namespace PatchHub.Infrastructure;

public static class ConfigureServices
{
	public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
	{
		services.AddParsingServices();
		services.AddSingleton(_ => new JsonService(Path.Join(Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location), "steam-games-list.json")));
		services.AddSingleton<SteamAppIdRepository>();
		services.AddSingleton<SteamApiService>();
		return services;
	}
}
