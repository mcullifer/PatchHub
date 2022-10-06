using Microsoft.AspNetCore.Components;
using PatchHub.Infrastructure.Contracts.Responses;
using PatchHub.Infrastructure.Models;

namespace PatchHub.UI.Components;

public partial class PatchNoteListItemComponent
{
	[Parameter]
	public NewsItem newsItem { get; set; }

	[Parameter]
	public SteamAppResponse SteamApp { get; set; }

	[Parameter]
	public EventCallback<NewsItem> OnSelectedNewsItemChanged { get; set; }

	[Parameter]
	public bool IsCurrentlySelected { get; set; }

	private int _defaultElevation = 4;

	private int _selectedElevation = 12;

	private int _hoverElevation = 8;

	private int _currentElevation = 4;

	private async void SelectNewsItem(NewsItem thisNewsItem)
	{
		await OnSelectedNewsItemChanged.InvokeAsync(thisNewsItem);
	}

	private DateTime CreateDateTime(int unixTimeStamp)
	{
		var dateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
		return dateTime.AddSeconds(unixTimeStamp).ToLocalTime();
	}
}
