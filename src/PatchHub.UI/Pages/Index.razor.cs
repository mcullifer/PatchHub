using Microsoft.AspNetCore.Components;
using PatchHub.Infrastructure.Contracts.Responses;
using PatchHub.Infrastructure.Repositories;
using PatchHub.Infrastructure.Services;

namespace PatchHub.UI.Pages;

public partial class Index
{
	[Inject]
	protected SteamAppIdRepository SteamAppRepo { get; set; }

	[Inject]
	protected SteamApiService SteamApi { get; set; }

	public DateOnly CurrentDate { get; set; } = DateOnly.FromDateTime(DateTime.Now);

	public List<DateOnly> ThisWeek { get; set; } = new();

	public SteamAppResponse? SelectedGame { get; set; }

	public DateOnly SubtractFromCurrentDate(int days)
	{
		return CurrentDate.AddDays(days);
	}

	protected override void OnInitialized()
	{
		var today = DateTime.Now;
		for (var i = 0; i < 8; i++)
		{
			ThisWeek.Add(DateOnly.FromDateTime(today.AddDays(-1 * i)));
		}
	}

	public async Task<IEnumerable<SteamAppResponse>> SearchGames(string value)
	{
		if (value != null)
		{
			return await SteamAppRepo.GetSteamAppsAsync(value);
		}
		return Enumerable.Empty<SteamAppResponse>();
	}
}
