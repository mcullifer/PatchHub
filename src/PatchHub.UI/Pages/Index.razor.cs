using Microsoft.AspNetCore.Components;
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

	public SteamApp? SelectedGame { get; set; }

	public IEnumerable<NewsItem>? NewsItems { get; set; }

	private bool ShowContent = false;

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
			ShowContent = true;
		}
		this.StateHasChanged();
	}
}
