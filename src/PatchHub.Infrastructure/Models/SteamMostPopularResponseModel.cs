namespace PatchHub.Infrastructure.Models;

public class SteamMostPopularResponseModel
{
    public int last_update { get; init; } = default!;

    public Ranks ranks { get; init; } = default!;
}

public class Ranks
{
    public List<Result> ranks { get; init; } = default!;
}

public class Result
{
    public int rank { get; init; } = default!;

    public int appid { get; init; } = default!;

    public int concurrent_in_game { get; init; } = default!;

    public int peak_in_game { get; init; } = default!;
}