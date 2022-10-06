using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Components;

public partial class PatchNotesComponent
{
	[Inject]
	protected IJSRuntime JsRuntime { get; set; } = null!;

	[Inject]
	protected SteamApiService? SteamApi { get; set; }

	[Parameter]
	public SteamApp? SteamApplication { get; set; }

	private IEnumerable<SteamAppNews>? _newsItems;

	private SteamAppNews? _selectedNewsItem;

	protected override async Task OnInitializedAsync()
	{
		await base.OnInitializedAsync();
		_newsItems = null;
	}

	protected override async Task OnParametersSetAsync()
	{
		await base.OnParametersSetAsync();
		if (SteamApplication != null && SteamApi != null)
		{
			_newsItems = await SteamApi.GetNewsForAppAsync(SteamApplication);
			_selectedNewsItem = _newsItems.FirstOrDefault();
		}
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", "PatchNoteListComponent");
	}

	private void SetSelectedNewsItem(SteamAppNews selectedNewsItem)
	{
		_selectedNewsItem = selectedNewsItem;
		StateHasChanged();
	}
}
