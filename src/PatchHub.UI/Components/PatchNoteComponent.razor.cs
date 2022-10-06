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

	public bool Expanded { get; set; } = false;

	protected override async Task OnParametersSetAsync()
	{
		await base.OnParametersSetAsync();
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", "PatchNoteComponent");
		StateHasChanged();
	}
}
