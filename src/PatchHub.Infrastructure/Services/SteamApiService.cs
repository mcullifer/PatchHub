﻿using System.Net.Http.Headers;
using System.Net.Http.Json;
using PatchHub.Infrastructure.Contracts.Responses;
using PatchHub.Infrastructure.Models;

namespace PatchHub.Infrastructure.Services;

public class SteamApiService
{
	private string _baseSteamApiUrl = "https://api.steampowered.com";

	private string _steamNewsRoute = "/ISteamNews/GetNewsForApp/v2/";

	public HttpClient SteamApiClient { get; set; }

	public SteamApiService()
	{
		SteamApiClient = new HttpClient();
		SteamApiClient.DefaultRequestHeaders.Accept.Clear();
		SteamApiClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
	}

	public async Task<IEnumerable<NewsItem>> GetNewsForAppAsync(SteamAppResponse app)
	{
		var url = _baseSteamApiUrl + _steamNewsRoute + $"?appid={app.AppID}&count=6";
		using HttpResponseMessage reponse = await SteamApiClient.GetAsync(url);
		if (reponse.IsSuccessStatusCode)
		{
			var steamNewsResponse = await reponse.Content.ReadFromJsonAsync<SteamNewsResponseModel>();
			return steamNewsResponse!.appnews.newsitems;
		}
		else
		{
			throw new Exception(reponse.ReasonPhrase);
		}
	}
}
