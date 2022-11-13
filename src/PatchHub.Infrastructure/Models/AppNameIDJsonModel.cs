namespace PatchHub.Infrastructure.Models;

public class AppNameIDJsonModel
{
	public AppList response { get; init; } = default!;
}

public class AppList
{
	public List<App> apps { get; init; } = default!;
}

public class App
{
	public int appid { get; init; } = default!;

	public string name { get; init; } = default!;
}
