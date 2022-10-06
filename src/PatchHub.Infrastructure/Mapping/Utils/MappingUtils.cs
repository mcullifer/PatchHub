namespace PatchHub.Infrastructure.Mapping.Utils;

public static class MappingUtils
{
	public static string CreateDateTimeString(int unixTimeStamp)
	{
		var dateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
		return dateTime.AddSeconds(unixTimeStamp).ToLocalTime().Date.ToString("MM/dd/yyyy");
	}
}
