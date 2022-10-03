namespace PatchHub.Parsers.Models;

public static class MarkdownModel
{
	public static readonly string Header1 = "#" + ' ';

	public static readonly string Header2 = "##" + ' ';

	public static readonly string Header3 = "###" + ' ';

	public static readonly string Bold = "**";

	public static readonly string Italic = "*";

	public static readonly string Quote = "> ";

	public static readonly string List = "- ";

	public static readonly string Code = "`";

	public static readonly string HorizontalRule = "---";

	public static readonly string Empty = "";

	public static readonly string ImageOpen = @"![](";

	public static readonly string ImageClose = @")";

	public static readonly string Spoiler = "||";
}
