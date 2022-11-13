using Microsoft.AspNetCore.Components;
using PatchHub.Infrastructure.Domain;

namespace PatchHub.UI.Pages;

public partial class SteamGamePage
{
	[Inject]
	protected NavigationManager NavigationManager { get; set; }

	[Parameter]
	public string? GameName { get; set; } = null;

	[Parameter]
	public string? GameId { get; set; } = null;

	private SteamApp SteamApplication = new();

	public bool IsFavorited { get; set; }

	protected override void OnParametersSet()
	{
		if (GameId != null)
		{
			var success = int.TryParse(GameId, out int parsedAppId);
			if (success)
			{
				SteamApplication = new()
				{
					AppID = parsedAppId,
					AppName = GameName!.Replace('-', ' ')
				};
			}
			else
			{
				NavigationManager.NavigateTo("/");
			}
		}
		base.OnParametersSet();
	}
}
