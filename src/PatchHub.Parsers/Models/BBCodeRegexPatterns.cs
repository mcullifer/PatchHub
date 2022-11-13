namespace PatchHub.Parsers.Models;

public static class BBCodeRegexPatterns
{
	public const string Bold = @"\[b\](.*?)\[\/b\]//gmi";

	public const string Italics = @"\[i\]\s*(.*?|\n)\s*\[\/i\]/gmi";
	// Regex statement to match [i][/i] and remove any whitespace inbetween
	//@"\[i\]((?:.|\n)+?)\[/i\]/gmi"

	public const string Underline = @"\[u\]((?:.|\n)+?)\[/u\]/gmi";

	public const string Strikethrough = @"\[s\]((?:.|\n)+?)\[/s\]/gmi";

	public const string Center = @"\[center\]((?:.|\n)+?)\[/center\]/gmi";

	public const string Quote = @"\[quote\]((?:.|\n)+?)\[/quote\]/gmi";

	public const string Size = @"\[size\=.+?\]((?:.|\n)+?)\[/size\]/gmi";

	public const string Color = @"\[color=(#?\w+)\]((?:.|\n)+?)\[\/color\]/gmi";

	public const string Image = @"\[img\]((?:.|\n)+?)\[\/img\]/gmi";

	public const string Url = @"\[url=(.+?)\]((?:.|\n)+?)\[/url\]/gmi";

	public const string List = @"\[list\]([\s\S]*?)\[/list\]/gmi";

	public const string ListItem = @"(\n)\[\*\]";

	public static Dictionary<string, string> Patterns = new()
	{
		{ List, @"$1" },
		{ ListItem, @"$1*"},
		{ Bold, @"**$1**" },
		{ Italics, @"*$1*" },
		{ Underline, @"$1"},
		{ Strikethrough, @"~~$1~~"},
		{ Center, @"$1"},
		{ Quote, @"> $1"},
		{ Size, @"## $1"},
		{ Color, @"$1"},
		{ Image, @"![$1]($1)"},
		{ Url, @"[$2]($1)"},
	};
}
