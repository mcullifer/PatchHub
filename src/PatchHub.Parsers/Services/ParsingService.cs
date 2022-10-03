using System.Text;
using PatchHub.Parsers.Models;

namespace PatchHub.Parsers.Services;

public sealed class ParsingService
{
	public string ParseBBCode(string input, bool steamContent = false)
	{
		var sb = new StringBuilder();

		var lines = input.Split(new string[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
		var parsed = lines.ToList();
		foreach (var line in lines)
		{
			sb.Clear();
			sb.Append(line);

			sb.Replace(BBCodeModel.ItalicOpen, MarkdownModel.Italic)
				.Replace(BBCodeModel.ItalicClose, MarkdownModel.Italic)
				.Replace(BBCodeModel.BoldOpen, MarkdownModel.Bold)
				.Replace(BBCodeModel.BoldClose, MarkdownModel.Bold)
				.Replace(BBCodeModel.UnderlineOpen, MarkdownModel.Empty)
				.Replace(BBCodeModel.UnderlineClose, MarkdownModel.Empty)
				.Replace(BBCodeModel.ListOpen, MarkdownModel.Empty)
				.Replace(BBCodeModel.ListClose, MarkdownModel.Empty)
				.Replace(BBCodeModel.OrderedListOpen, MarkdownModel.Empty)
				.Replace(BBCodeModel.OrderedListClose, MarkdownModel.Empty)
				.Replace(BBCodeModel.BulletItem, MarkdownModel.List)
				.Replace(BBCodeModel.Header1Open, MarkdownModel.Header1)
				.Replace(BBCodeModel.Header1Close, MarkdownModel.Empty)
				.Replace(BBCodeModel.Header2Open, MarkdownModel.Header2)
				.Replace(BBCodeModel.Header2Close, MarkdownModel.Empty)
				.Replace(BBCodeModel.Header3Open, MarkdownModel.Header3)
				.Replace(BBCodeModel.Header3Close, MarkdownModel.Empty)
				.Replace(BBCodeModel.SpoilerOpen, MarkdownModel.Empty)
				.Replace(BBCodeModel.SpoilerClose, MarkdownModel.Empty);

			if (steamContent)
			{
				sb.Replace(BBCodeModel.ImageOpen + "{STEAM_CLAN_IMAGE}", MarkdownModel.ImageOpen + "https://cdn.akamai.steamstatic.com/steamcommunity/public/images/clans//")
					.Replace(BBCodeModel.ImageClose, MarkdownModel.ImageClose);
			}

			parsed[parsed.IndexOf(line)] = sb.ToString();
		}

		var finalMarkdownString = string.Join(Environment.NewLine, parsed);
		return finalMarkdownString;
	}
}
