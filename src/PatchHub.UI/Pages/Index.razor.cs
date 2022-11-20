using Microsoft.AspNetCore.Components;
using MudBlazor;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Pages;

public partial class Index
{
    [Inject]
    private SteamApiService SteamApi { get; set; } = default!;

    private List<SteamAppPopular> _popularApps = new();

    private MudListItem? selectedRecentItem;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            await foreach (var popularApp in SteamApi.GetMostPopularAsync(14))
            {
                if (!string.IsNullOrEmpty(popularApp.AppName))
                {
                    _popularApps.Add(popularApp);
                    StateHasChanged();
                }
            }
        }
        await base.OnAfterRenderAsync(firstRender);
    }
}
