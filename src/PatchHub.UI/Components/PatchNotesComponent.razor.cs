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

	PatchNoteComponent? ThisPatchNote;

	private int SelectedPage = 1;

	protected override async Task OnInitializedAsync()
	{
		await base.OnInitializedAsync();
	}

	protected override async Task OnParametersSetAsync()
	{
		ResetNewsItems();
		_newsItems = await SteamApi.GetNewsForAppAsync(SteamApplication!);
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", "PatchNoteListComponent");
		SelectedNewsItem = _newsItems.FirstOrDefault();
		await base.OnParametersSetAsync();
	}

	private void SetSelectedNewsItem(SteamAppNews selectedNewsItem)
	{
		SelectedNewsItem = selectedNewsItem;
		SelectedPage = 1;
		StateHasChanged();
	}

	private void ResetNewsItems()
	{
		_newsItems = null;
		SelectedNewsItem = null;
		StateHasChanged();
	}
}
