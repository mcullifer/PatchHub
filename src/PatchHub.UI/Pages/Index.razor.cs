using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;
using MudBlazor;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Pages;

public partial class Index
{
    [Inject]
    SteamApiService SteamApi { get; set; }

    [Inject]
    NavigationManager NavigationManager { get; set; }

    private IEnumerable<SteamAppPopular> _popularApps = Enumerable.Empty<SteamAppPopular>();

    private MudListItem selectedTopGamesItem;

    private MudListItem selectedRecentItem;

    protected override async Task OnParametersSetAsync()
    {
        _popularApps = await SteamApi.GetMostPopularAsync();
        await base.OnParametersSetAsync();
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
}
