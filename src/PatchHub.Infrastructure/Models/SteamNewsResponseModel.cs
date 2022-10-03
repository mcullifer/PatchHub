namespace PatchHub.Infrastructure.Models;

public class SteamNewsResponseModel
{
	public AppNews appnews { get; init; } = default!;
}

public class AppNews
{
	public int appid { get; init; } = default!;
	public List<NewsItem> newsitems { get; init; } = default!;
}

public class NewsItem
{
	public string gid { get; init; } = default!;

	public string title { get; init; } = default!;

	public string url { get; init; } = default!;

	public bool is_external_url { get; init; } = default!;

	public string author { get; init; } = default!;

	public string contents { get; init; } = default!;

	public string feedlabel { get; init; } = default!;

	public int date { get; init; } = default!;

	public string feedname { get; init; } = default!;

	public int feed_type { get; init; } = default!;

	public int appid { get; init; } = default!;

	public List<string> tags { get; init; } = default!;
}

