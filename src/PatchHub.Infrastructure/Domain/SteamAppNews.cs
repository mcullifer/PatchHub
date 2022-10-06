namespace PatchHub.Infrastructure.Domain;

public class SteamAppNews
{
	public string PostId { get; init; } = default!;

	public int AppId { get; init; } = default!;

	public string Url { get; init; } = default!;

	public string Date { get; init; } = default!;

	public string Title { get; init; } = default!;

	public string Author { get; init; } = default!;

	public string Contents { get; init; } = default!;

	public List<string> Tags { get; init; } = default!;
}
