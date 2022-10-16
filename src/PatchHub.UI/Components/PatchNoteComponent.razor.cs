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

	[Parameter]
	public bool IsMobile { get; set; }

	private string _componentName = string.Empty;

	private readonly string _anim_classes = "py-8 px-4 overflow-y-scroll rounded-lg news-container animate__animated animate__slideInRight";

	private string DefaultContainerClasses = "py-8 px-4 overflow-y-scroll rounded-lg news-container";

	protected override void OnParametersSet()
	{
		base.OnParametersSet();
		if (IsMobile)
		{
			DefaultContainerClasses = "pb-15 px-2 mx-4 overflow-y-scroll rounded-lg news-container-mobile";
		}
		else
		{
			DefaultContainerClasses = _anim_classes;
		}
	}

	protected override async Task OnAfterRenderAsync(bool firstRender)
	{
		if (News != null)
		{
			_componentName = News.PostId;
		}
		if (_componentName != string.Empty)
		{
			await JsRuntime.InvokeVoidAsync("OnScrollEvent", _componentName);
		}
		DefaultContainerClasses = _anim_classes;
		if (firstRender)
		{
			base.OnAfterRender(firstRender);
		}
	}

	public void ResetNewsComponent()
	{
		News = null;
		SteamApplication = null;
		_componentName = string.Empty;
		DefaultContainerClasses = "py-8 px-4 overflow-y-scroll rounded-lg news-container";
		JsRuntime.InvokeVoidAsync("OnScrollEvent", "News" + _componentName);
		StateHasChanged();
	}
}
