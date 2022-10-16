using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using MudBlazor;
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

	private int SelectedNewsItemIndex = 0;

	private string ComponentHeight = "";

	protected override async Task OnInitializedAsync()
	{
		await base.OnInitializedAsync();
	}

	protected override async Task OnParametersSetAsync()
	{
		ResetNewsItems();
		_newsItems = await SteamApi.GetNewsForAppAsync(SteamApplication!);
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", "PatchNoteListComponent");
		ComponentHeight = await JsRuntime.InvokeAsync<string>("GetViewPortHeight") + "px";
		SelectedNewsItem = _newsItems.FirstOrDefault();
		await base.OnParametersSetAsync();
	}

	private void SetSelectedNewsItem(SteamAppNews selectedNewsItem)
	{
		SelectedNewsItem = selectedNewsItem;
		SelectedPage = 1;
		StateHasChanged();
	}

	private void SelectNextNewsItemMobile(SwipeDirection swipeDirection)
	{
		switch (swipeDirection)
		{
			case SwipeDirection.RightToLeft:
				if (SelectedNewsItemIndex < _newsItems!.Count() - 1)
				{
					SelectedNewsItemIndex++;
				}
				else
				{
					SelectedNewsItemIndex = 0;
				}
				ThisPatchNote!.ResetNewsComponent();
				break;
			case SwipeDirection.LeftToRight:
				if (SelectedNewsItemIndex > 0)
				{
					SelectedNewsItemIndex--;
				}
				else
				{
					SelectedNewsItemIndex = _newsItems!.Count() - 1;
				}
				ThisPatchNote!.ResetNewsComponent();
				break;
		};
		SelectedNewsItem = _newsItems!.ElementAt(SelectedNewsItemIndex);
		StateHasChanged();
	}

	private void ResetNewsItems()
	{
		_newsItems = null;
		SelectedNewsItem = null;
		StateHasChanged();
	}
}
