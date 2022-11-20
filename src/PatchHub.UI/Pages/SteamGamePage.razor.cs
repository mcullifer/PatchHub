using Microsoft.AspNetCore.Components;
using MudBlazor;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Repositories;

namespace PatchHub.UI.Pages;

public partial class SteamGamePage
{
	[Inject] protected NavigationManager NavigationManager { get; set; } = default!;

	[Inject] protected SteamAppIdRepository SteamAppIdRepository { get; set; } = default!;

	[Parameter] public string? GameName { get; set; } = null;

	[Parameter] public string? GameId { get; set; } = null;

	private SteamApp SteamApplication = new();

	private bool IsFavorited = false;

	private string favoriteIcon = Icons.Material.Filled.FavoriteBorder;

	protected override async Task OnParametersSetAsync()
	{
		await base.OnParametersSetAsync();
		if (GameId != null)
		{
			var success = int.TryParse(GameId, out int parsedAppId);
			if (success)
			{
				var steamApp = await SteamAppIdRepository.GetSteamAppFromIdAsync(parsedAppId);
				SteamApplication = steamApp;
			}
			else
			{
				NavigationManager.NavigateTo("/");
			}
		}
	}

	private void ToggleFavorite()
	{
		IsFavorited = !IsFavorited;
		favoriteIcon = IsFavorited ? Icons.Material.Filled.Favorite : Icons.Material.Filled.FavoriteBorder;
		StateHasChanged();
	}
}
