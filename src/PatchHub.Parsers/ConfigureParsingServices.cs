using Microsoft.Extensions.DependencyInjection;
using PatchHub.Parsers.Services;

namespace PatchHub.Parsers;

public static class ConfigureParsingServices
{
	public static IServiceCollection AddParsingServices(this IServiceCollection services)
	{
		services.AddSingleton<ParsingService>();
		return services;
	}
}
