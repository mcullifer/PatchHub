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

	private readonly string _textStyle = "transition: color 300ms cubic-bezier(.4, 0, .2, 1) 0ms;";

	private readonly int _defaultElevation = 4;

	private readonly int _selectedElevation = 8;

	private readonly int _hoverElevation = 8;

	private int CurrentElevation = 4;

	private async void SelectNewsItem(SteamAppNews thisNewsItem)
	{
		await OnSelectedNewsItemChanged.InvokeAsync(thisNewsItem);
	}
}
