using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using PatchHub.Infrastructure.Domain;

namespace PatchHub.UI.Components;

public partial class PatchNoteComponent
{
	[Inject]
	protected IJSRuntime JsRuntime { get; set; } = null!;

	[Parameter]
	public SteamAppNews? News { get; set; }

	[Parameter]
	public SteamApp? SteamApplication { get; set; }

	[CascadingParameter]
	protected SteamAppNews? CurrentNewsItem { get; set; }

	private string _componentName;

	private int _opacity = 0;

	protected override async Task OnParametersSetAsync()
	{
		_componentName = News.PostId;
		StateHasChanged();
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", _componentName);
		await base.OnParametersSetAsync();
	}
}
