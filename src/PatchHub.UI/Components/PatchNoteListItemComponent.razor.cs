using Microsoft.AspNetCore.Components;
using PatchHub.Infrastructure.Domain;

namespace PatchHub.UI.Components;

public partial class PatchNoteListItemComponent
{
	[Parameter]
	public SteamAppNews? NewsContent { get; set; }

	[Parameter]
	public SteamApp? SteamApplication { get; set; }

	[Parameter]
	public EventCallback<SteamAppNews> OnSelectedNewsItemChanged { get; set; }

	[Parameter]
	public bool IsCurrentlySelected { get; set; }

	private int _defaultElevation = 4;

	private int _selectedElevation = 12;

	private int _hoverElevation = 8;

	private int _currentElevation = 4;

	private async void SelectNewsItem(SteamAppNews thisNewsItem)
	{
		await OnSelectedNewsItemChanged.InvokeAsync(thisNewsItem);
	}
}
