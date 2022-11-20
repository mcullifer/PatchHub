using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using MudBlazor;
using MudBlazor.Utilities;
using PatchHub.Infrastructure.Domain;

namespace PatchHub.UI.Components;

public partial class PatchNote
{
	[Inject] protected IJSRuntime JsRuntime { get; set; } = default!;

	[Inject] private IScrollManager ScrollManager { get; set; } = default!;

	[Parameter] public SteamAppNews? News { get; set; } = null!;

	[Parameter] public SteamApp? SteamApplication { get; set; } = null!;

	[Parameter] public string Class { get; set; } = string.Empty;

	[Parameter] public EventCallback<string> OnClassChanged { get; set; }

	[Parameter] public bool IsMobile { get; set; }

	private string _componentName = string.Empty;

	private string DefaultContainerClasses =>
		new CssBuilder("rounded-lg animate__animated")
		.AddClass("overflow-y-scroll mb-4 py-8 px-4 animate__slideInRight news-container", !IsMobile)
		.AddClass("pb-10 my-4 news-container-mobile", IsMobile)
		.Build();

	protected override async Task OnAfterRenderAsync(bool firstRender)
	{
		await base.OnAfterRenderAsync(firstRender);

		if (firstRender)
		{
			if (News != null)
			{
				_componentName = News.PostId;
			}
			if (_componentName != string.Empty)
			{
				await ScrollManager.ScrollToTopAsync("News" + _componentName, ScrollBehavior.Smooth);
				//await JsRuntime.InvokeVoidAsync("OnScrollEvent", "News" + _componentName);
			}
			StateHasChanged();
		}
	}

	public void ResetNewsComponent()
	{
		News = null;
		SteamApplication = null;
		_componentName = string.Empty;
		StateHasChanged();
	}
}
