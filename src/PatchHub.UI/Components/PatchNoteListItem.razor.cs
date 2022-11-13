using Microsoft.AspNetCore.Components;
using MudBlazor.Utilities;
using PatchHub.Infrastructure.Domain;


namespace PatchHub.UI.Components;

public partial class PatchNoteListItem
{
	[Parameter]
	public SteamAppNews? NewsContent { get; set; }

	[Parameter]
	public SteamApp? SteamApplication { get; set; }

	[Parameter]
	public bool IsMobile { get; set; }

	[Parameter]
	public EventCallback<SteamAppNews> OnSelectedNewsItemChanged { get; set; }

	[Parameter]
	public bool IsCurrentlySelected { get; set; }

	private readonly string _textStyle = "transition: color 300ms cubic-bezier(.4, 0, .2, 1) 0ms;";

	private readonly int _defaultElevation = 2;

	private readonly int _selectedElevation = 8;

	private readonly int _hoverElevation = 4;

	private int CurrentElevation = 2;

	private string DefaultClasses =>
		new CssBuilder("news-list-item rounded-lg cursor-pointer")
			.AddClass("animate__animated animate__pulse", IsCurrentlySelected)
			.Build();

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
