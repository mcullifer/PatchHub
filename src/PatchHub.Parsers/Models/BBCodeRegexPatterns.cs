namespace PatchHub.Parsers.Models;

public static class BBCodeRegexPatterns
{
	public const string Bold = @"\[b\](.*?)\[\/b\]";

	public const string Italics = @"\[i\]\s*(.*?|\n)\s*\[\/i\]";

	public const string Underline = @"\[u\]((?:.|\n)+?)\[/u\]";

	public const string Strikethrough = @"\[s\]((?:.|\n)+?)\[/s\]";

	public const string Center = @"\[center\]((?:.|\n)+?)\[/center\]";

	public const string Quote = @"\[quote\]((?:.|\n)+?)\[/quote\]";

	public const string Size = @"\[size\=.+?\]((?:.|\n)+?)\[/size\]";

	public const string Color = @"\[color=(#?\w+)\]((?:.|\n)+?)\[\/color\]";

	public const string Image = @"\[img\]((?:.|\n)+?)\[/img\]";

	public const string Url = @"\[url=(.+?)\]((?:.|\n)+?)\[/url\]";

	public const string List = @"\[list\]([\s\S]*?)\[/list\]";

	public const string ListItem = @"(\n)\[\*\]";

	public static Dictionary<string, string> Patterns = new()
	{
		{ List, @"$1" },
		{ ListItem, @"$1* " },
		{ Bold, @"**$1**" },
		{ Italics, @"*$1*" },
		{ Underline, @"$1" },
		{ Strikethrough, @"~~$1~~" },
		{ Center, @"$1" },
		{ Quote, @"> $1" },
		{ Size, @"## $1" },
		{ Color, @"$1" },
		{ Image, @"![$1]($1)" },
		{ Url, @"[$2]($1)" },
	};
}
