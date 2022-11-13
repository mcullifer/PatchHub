using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using MudBlazor;
using PatchHub.Infrastructure.Domain;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Components;

public partial class PatchNotes
{
	[Inject]
	protected IJSRuntime JsRuntime { get; set; }

	[Inject]
	protected NavigationManager NavigationManager { get; set; }

	[Inject]
	protected SteamApiService SteamApi { get; set; }

	[Inject]
	private IScrollManager ScrollManager { get; set; }

	[Parameter]
	public SteamApp SteamApplication { get; set; }

	public SteamAppNews? SelectedNewsItem { get; set; }

	private IEnumerable<SteamAppNews>? _newsItems;

	private bool _newsDialogOpen;

	private DialogOptions _dialogOptions = new() { Position = DialogPosition.Center, CloseButton = true };

	private void OpenNewsDialog() => _newsDialogOpen = true;

	PatchNote? ThisPatchNote;

	private string screenHeight;

	private string screenWidth;

	private string distanceToBottom;

	protected override void OnInitialized()
	{
		base.OnInitialized();
		NavigationManager.LocationChanged += (sender, args) =>
		{
			ThisPatchNote?.ResetNewsComponent();
		};
	}

	protected override async Task OnParametersSetAsync()
	{
		_newsItems = await SteamApi.GetNewsForAppAsync(SteamApplication!);
		SelectedNewsItem ??= new();
		if (SelectedNewsItem.AppId != _newsItems.First().AppId)
		{
			SelectedNewsItem = _newsItems.FirstOrDefault();
		}
		await base.OnParametersSetAsync();
	}

	protected override async Task OnAfterRenderAsync(bool firstRender)
	{
		await base.OnAfterRenderAsync(firstRender);
		if (firstRender)
		{
			screenWidth = await JsRuntime.InvokeAsync<string>("GetViewPortWidth");
			var fullHeight = await JsRuntime.InvokeAsync<string>("GetViewPortHeight");
			screenHeight = (int.Parse(fullHeight) - 100).ToString();
			await ScrollManager.ScrollToTopAsync("PatchNoteList", ScrollBehavior.Smooth);
			StateHasChanged();
		}
	}

	private void SetSelectedNewsItem(SteamAppNews selectedNewsItem)
	{
		SelectedNewsItem = selectedNewsItem;
		StateHasChanged();
	}

	private void ResetNews()
	{
		if (ThisPatchNote != null)
		{
			ThisPatchNote.ResetNewsComponent();
		}
	}

	private void ResetNewsItems()
	{
		_newsItems = null;
		SelectedNewsItem = null;
		StateHasChanged();
	}
}
