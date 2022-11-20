using System.Net.Http.Headers;
using System.Net.Http.Json;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Mapping;
using PatchHub.Infrastructure.Models;
using PatchHub.Infrastructure.Repositories;
using PatchHub.Parsers.Services;

namespace PatchHub.Infrastructure.Services;

public class SteamApiService
{
    private readonly string _baseSteamApiUrl = "https://api.steampowered.com";

    private readonly string _steamNewsRoute = "/ISteamNews/GetNewsForApp/v2/";

    private readonly string _steamMostPlayedRoute = "/ISteamChartsService/GetGamesByConcurrentPlayers/v1/";

    private readonly ParsingService _parsingService;

    private readonly SteamAppIdRepository _steamAppIdRepository;

    public HttpClient SteamApiClient { get; set; }

    public SteamApiService(ParsingService parsingService, SteamAppIdRepository steamAppIdRepository)
    {
        _parsingService = parsingService;
        _steamAppIdRepository = steamAppIdRepository;
        SteamApiClient = new HttpClient();
        SteamApiClient.DefaultRequestHeaders.Accept.Clear();
        SteamApiClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<IEnumerable<SteamAppNews>> GetNewsForAppAsync(SteamApp app)
    {
        var url = _baseSteamApiUrl + _steamNewsRoute + $"?appid={app.AppID}&count=6&feeds=steam_community_announcements";
        using HttpResponseMessage reponse = await SteamApiClient.GetAsync(url);
        if (reponse.IsSuccessStatusCode)
        {
            var steamNewsResponse = await reponse.Content.ReadFromJsonAsync<SteamNewsResponseModel>();
            var steamAppNews = steamNewsResponse!.appnews.newsitems.ToSteamAppsNews(_parsingService);
            return steamAppNews;
        }
        else
        {
            throw new Exception(reponse.ReasonPhrase);
        }
    }

    public async IAsyncEnumerable<SteamAppPopular> GetMostPopularAsync(int count)
    {
        var url = _baseSteamApiUrl + _steamMostPlayedRoute;
        using HttpResponseMessage response = await SteamApiClient.GetAsync(url);
        if (response.IsSuccessStatusCode)
        {
            SteamMostPopularResponseModel? mostPlayedResponse = await response.Content.ReadFromJsonAsync<SteamMostPopularResponseModel>();
            await foreach (var app in mostPlayedResponse!.ToSteamAppPopularAsync(_steamAppIdRepository, count))
            {
                yield return app;
            }
        }
        else
        {
            yield return new SteamAppPopular();
        }
    }
}
