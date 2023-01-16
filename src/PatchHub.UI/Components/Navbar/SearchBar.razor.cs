using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;
using MudBlazor;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Repositories;

namespace PatchHub.UI.Components.Navbar;

public partial class SearchBar : ComponentBase
{
	[Inject] protected NavigationManager NavigationManager { get; set; } = default!;

	[Inject] private SteamAppIdRepository SteamAppRepo { get; set; } = default!;

	private bool _searchDialogOpen;

	MudAutocomplete<SteamApp>? _searchBar;

	private DialogOptions _dialogOptions = new() { Position = DialogPosition.TopCenter, NoHeader = true };

	private void OpenSearchDialog() => _searchDialogOpen = true;

	public void SearchValueChanged(SteamApp selected)
	{
		if (selected != null)
		{
			NavigationManager!.NavigateTo("/" + CleanGameName(selected.AppName) + "/" + selected.AppID);
			_searchBar!.Clear();
		}
	}

	public async Task<IEnumerable<SteamApp>> SearchGames(string value)
	{
		if (value != null && value != string.Empty)
		{
			var apps = await SteamAppRepo!.GetSteamAppsAsync(value);
			return apps.Apps;
		}
		return Enumerable.Empty<SteamApp>();
	}

	private string CleanGameName(string gameName)
	{
		gameName = GameNameRegex().Replace(gameName, "").Replace(' ', '-');
		return gameName;
	}

	[GeneratedRegex("[^A-Za-z0-9 ]")]
	private static partial Regex GameNameRegex();
}
