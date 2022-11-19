using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;
using MudBlazor;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Repositories;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Pages;

public partial class Index
{
    [Inject]
    SteamApiService SteamApi { get; set; }

    [Inject]
    SteamAppIdRepository SteamAppIdRepository { get; set; }

    [Inject]
    NavigationManager NavigationManager { get; set; }

    private List<SteamAppPopular> _popularApps = new List<SteamAppPopular>();

    private MudListItem selectedTopGamesItem;

    private MudListItem selectedRecentItem;

    private bool isLoaded = false;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            await foreach (var popularApp in SteamApi.GetMostPopularAsync())
            {
                if (!string.IsNullOrEmpty(popularApp.AppName))
                {
                    _popularApps.Add(popularApp);
                    StateHasChanged();
                }
            }
            isLoaded = true;
            StateHasChanged();
        }
        await base.OnAfterRenderAsync(firstRender);
    }
    private void NavigateToGame(int gameId, string gameName)
    {
        NavigationManager!.NavigateTo("/" + CleanGameName(gameName) + "/" + gameId.ToString());
    }

    private string CleanGameName(string gameName)
    {
        gameName = Regex.Replace(gameName, "[^A-Za-z0-9 ]", "").Replace(' ', '-');
        return gameName;
    }

    private IEnumerable<SteamAppPopular> FilterUnknownApps(IEnumerable<SteamAppPopular> popularApps)
    {
        return popularApps.Where(app => !string.IsNullOrEmpty(app.AppName)).Take(10);
    }
}
