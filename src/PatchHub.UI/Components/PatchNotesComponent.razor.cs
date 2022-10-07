using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Components;

public partial class PatchNotesComponent
{
	[Inject]
	protected IJSRuntime JsRuntime { get; set; }

	[Inject]
	protected SteamApiService SteamApi { get; set; }

	[Parameter]
	public SteamApp? SteamApplication { get; set; }

	private IEnumerable<SteamAppNews>? _newsItems;

	public SteamAppNews? SelectedNewsItem { get; set; }

	protected override async Task OnInitializedAsync()
	{
		_newsItems = null;
		SelectedNewsItem = null;
		await base.OnInitializedAsync();
	}

	protected override async Task OnParametersSetAsync()
	{
		_newsItems = await SteamApi.GetNewsForAppAsync(SteamApplication!);
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", "PatchNoteListComponent");
		SelectedNewsItem = _newsItems.FirstOrDefault();
		await base.OnParametersSetAsync();
	}

	private void SetSelectedNewsItem(SteamAppNews selectedNewsItem)
	{
		SelectedNewsItem = selectedNewsItem;
		StateHasChanged();
	}
}
