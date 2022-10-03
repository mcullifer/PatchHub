namespace PatchHub.Infrastructure.Contracts.Responses;

public class SteamAppResponse
{
	public int AppID { get; init; } = default!;

	public string AppName { get; init; } = default!;
}
