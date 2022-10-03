using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using PatchHub.Infrastructure.Repositories;
using PatchHub.Infrastructure.Services;

namespace PatchHub.Infrastructure;

public static class ConfigureServices
{
	public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
	{
		services.AddSingleton(_ => new JsonService(Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location) + "\\steam-app-ids.json"));
		services.AddSingleton<SteamAppIdRepository>();
		services.AddSingleton<SteamApiService>();
		return services;
	}
}
