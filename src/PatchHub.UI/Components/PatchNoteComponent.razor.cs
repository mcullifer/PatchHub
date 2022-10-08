using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using PatchHub.Infrastructure.Domain;

namespace PatchHub.UI.Components;

public partial class PatchNoteComponent
{
	[Inject]
	protected IJSRuntime JsRuntime { get; set; } = null!;

	[Parameter]
	public SteamAppNews? News { get; set; } = null!;

	[Parameter]
	public SteamApp? SteamApplication { get; set; } = null!;

	[Parameter]
	public string Class { get; set; } = string.Empty;

	[Parameter]
	public EventCallback<string> OnClassChanged { get; set; }

	private string _componentName = string.Empty;

	protected override async Task OnAfterRenderAsync(bool firstRender)
	{
		_componentName = News.PostId;
		Class = "visible-news";
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", _componentName);
		this.StateHasChanged();
	}

	public void ResetNewsComponent()
	{
		this.News = null;
		this.SteamApplication = null;
		this.Class = "hidden-news";
		this._componentName = string.Empty;
		this.StateHasChanged();
	}
}
