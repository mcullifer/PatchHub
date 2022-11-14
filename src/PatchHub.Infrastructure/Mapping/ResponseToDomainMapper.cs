using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Mapping.Utils;
using PatchHub.Infrastructure.Models;
using PatchHub.Infrastructure.Repositories;
using PatchHub.Parsers.Services;

namespace PatchHub.Infrastructure.Mapping;

public static class ResponseToDomainMapper
{
	public static SteamApp ToSteamApp(this App app)
	{
		return new SteamApp
		{
			AppID = app.appid,
			AppName = app.name
		};
	}

	public static SteamApps ToSteamApps(this IEnumerable<App> apps)
	{
		return new SteamApps
		{
			Apps = apps.Select(x => x.ToSteamApp())
		};
	}

	public static SteamAppNews ToSteamAppNews(this NewsItem newsItem, ParsingService parsingService)
	{
		return new SteamAppNews
		{
			PostId = newsItem.gid,
			AppId = newsItem.appid,
			Url = newsItem.url,
			Date = MappingUtils.CreateDateTimeString(newsItem.date),
			Title = newsItem.title,
			Author = newsItem.author,
			Contents = parsingService.ParseBBCode(newsItem.contents, true),
		};
	}

	public static IEnumerable<SteamAppNews> ToSteamAppsNews(this IEnumerable<NewsItem> newsItems, ParsingService parsingService)
	{
		return newsItems.Select(x => x.ToSteamAppNews(parsingService));
	}

	public static async Task<IEnumerable<SteamAppPopular>> ToSteamAppPopularAsync(this SteamMostPopularResponseModel mostPlayed, SteamAppIdRepository steamAppIdRepository)
	{
		var popularApps = mostPlayed.response.ranks.Take(10).Select(async x =>
		{
			var app = await steamAppIdRepository.GetSteamAppFromIdAsync(x.appid);
			return new SteamAppPopular()
			{
				AppID = app.AppID,
				AppName = app.AppName,
				CurrentCount = x.concurrent_in_game,
				PeakCount = x.peak_in_game
			};
		});
		return await Task.WhenAll(popularApps);
	}
}
