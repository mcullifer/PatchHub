namespace PatchHub.Parsers.Models;

public static class BBCodeModel
{
	public static readonly string Header1Open = "[h1]";

	public static readonly string Header1Close = "[/h1]";

	public static readonly string Header2Open = "[h2]";

	public static readonly string Header2Close = "[/h2]";

	public static readonly string Header3Open = "[h3]";

	public static readonly string Header3Close = "[/h3]";

	public static readonly string BoldOpen = "[b]";

	public static readonly string BoldClose = "[/b]";

	public static readonly string UnderlineOpen = "[u]";

	public static readonly string UnderlineClose = "[/u]";

	public static readonly string ItalicOpen = "[i]";

	public static readonly string ItalicClose = "[/i]";

	public static readonly string StrikethroughOpen = "[strike]";

	public static readonly string StrikethroughClose = "[/strike]";

	public static readonly string SpoilerOpen = "[spoiler]";

	public static readonly string SpoilerClose = "[/spoiler]";

	public static readonly string NoParseOpen = "[noparse]";

	public static readonly string NoParseClose = "[/noparse]";

	public static readonly string HorizontalRuleOpen = "[hr]";

	public static readonly string HorizontalRuleClose = "[/hr]";

	public static readonly string UrlOpen = "[url=";

	public static readonly string UrlClose = "[/url]";

	public static readonly string ImageOpen = "[img]";

	public static readonly string ImageClose = "[/img]";

	public static readonly string ListOpen = "[list]";

	public static readonly string ListClose = "[/list]";

	public static readonly string OrderedListOpen = "[olist]";

	public static readonly string OrderedListClose = "[/olist]";

	public static readonly string BulletItem = "[*]";

	public static readonly string QuoteOpen = "[quote]";

	public static readonly string QuoteClose = "[/quote]";

	public static readonly string CodeOpen = "[code]";

	public static readonly string CodeClose = "[/code]";

	public static readonly string Newline = @"\n";
}
