using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using PatchHub.Infrastructure.Contracts.Responses;
using PatchHub.Infrastructure.Models;

namespace PatchHub.UI.Components;

public partial class PatchNoteComponent
{
	[Parameter]
	public NewsItem newsItem { get; set; }

	[Parameter]
	public SteamAppResponse SteamApp { get; set; }

	public bool Expanded { get; set; } = false;

	private string _expansionClass = "collapsed";

	protected override async Task OnParametersSetAsync()
	{
		await base.OnParametersSetAsync();
		await JsRuntime.InvokeVoidAsync("OnScrollEvent", "PatchNoteComponent");
		StateHasChanged();
	}

	private DateTime CreateDateTime(int unixTimeStamp)
	{
		var dateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
		return dateTime.AddSeconds(unixTimeStamp).ToLocalTime();
	}
}
