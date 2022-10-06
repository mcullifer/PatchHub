using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using PatchHub.Infrastructure.Contracts.Responses;
using PatchHub.Infrastructure.Models;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Components;

public partial class PatchNotesComponent
{
	[Inject]
	protected SteamApiService SteamApi { get; set; }

	[Parameter]
	public SteamAppResponse SteamApp { get; set; }

	private IEnumerable<NewsItem>? _newsItems;

	private NewsItem? _selectedNewsItem { get; set; }

	protected override async Task OnInitializedAsync()
	{
		await base.OnInitializedAsync();
		_newsItems = null;
	}

	protected override async Task OnParametersSetAsync()
	{
		await base.OnParametersSetAsync();
		_newsItems = await SteamApi.GetNewsForAppAsync(SteamApp);
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", "PatchNoteListComponent");
		_selectedNewsItem = _newsItems.FirstOrDefault();
	}

	private void SetSelectedNewsItem(NewsItem selectedNewsItem)
	{
		_selectedNewsItem = selectedNewsItem;
		StateHasChanged();
	}
}
