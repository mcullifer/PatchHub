using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;
using MudBlazor;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Models;
using PatchHub.Infrastructure.Repositories;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Pages;

public partial class Index
{
	[Inject]
	protected SteamAppIdRepository? SteamAppRepo { get; set; }

	[Inject]
	protected SteamApiService? SteamApi { get; set; }

	[Inject]
	protected NavigationManager? NavigationManager { get; set; }

	[Parameter]
	public string? GameName { get; set; } = null;

	private MudAutocomplete<SteamApp>? SearchBar;

	public SteamApp? SelectedGame { get; set; }

	public IEnumerable<NewsItem>? NewsItems { get; set; }

	private bool ShowContent = false;

	protected override void OnParametersSet()
	{
		base.OnParametersSet();
		if (GameName == null)
		{
			SelectedGame = null;
			NewsItems = null;
			GameName = null;
			ShowContent = false;
			if (SearchBar != null)
			{
				SearchBar.Clear();
			}
		}
		StateHasChanged();
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

	public void SearchValueChanged(SteamApp selected)
	{
		if (selected != null)
		{
			SelectedGame = selected;
			NavigationManager!.NavigateTo("/" + CleanGameName(selected.AppName));
			ShowContent = true;
		}
	}

	private string CleanGameName(string gameName)
	{
		gameName = Regex.Replace(gameName, "[^A-Za-z0-9 ]", "").Replace(' ', '-');
		return gameName;
	}
}
