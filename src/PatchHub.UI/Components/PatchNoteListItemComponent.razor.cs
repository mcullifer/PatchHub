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

	private readonly int _selectedElevation = 12;

	private readonly int _hoverElevation = 8;

	private int CurrentElevation = 4;

	private readonly string _anim_classes = "news-list-item animate__animated animate__pulse";

	private readonly string _default_classes = "mb-4 mx-4 py-8 px-4 rounded-lg news-list-item cursor-pointer";

	private async void SelectNewsItem(SteamAppNews thisNewsItem)
	{
		IsCurrentlySelected = false;
		StateHasChanged();
		await OnSelectedNewsItemChanged.InvokeAsync(thisNewsItem);

	}

	protected override void OnAfterRender(bool firstRender)
	{
		if (firstRender)
		{
			StateHasChanged();
			base.OnAfterRender(firstRender);
		}
	}
}
