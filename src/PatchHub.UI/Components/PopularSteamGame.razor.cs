using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;
using PatchHub.Infrastructure.Domain;

namespace PatchHub.UI.Components;

public partial class PopularSteamGame
{
    [Inject] protected NavigationManager NavigationManager { get; set; } = default!;

    [Parameter] public SteamAppPopular PopularApp { get; set; } = default!;

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
