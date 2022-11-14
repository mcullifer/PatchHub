using System.Text;
using System.Text.RegularExpressions;
using PatchHub.Parsers.Models;

namespace PatchHub.Parsers.Services;

public sealed class ParsingService
{
	public string ParseBBCode(string input, bool steamContent = false)
	{
		var sb = new StringBuilder();
		var regexCleanedLine = ConvertBBCodeToMarkdown(input);
		sb.Append(regexCleanedLine)
			.Replace(BBCodeModel.Header1Open, MarkdownModel.Header1)
			.Replace(BBCodeModel.Header1Close, MarkdownModel.Empty)
			.Replace(BBCodeModel.Header2Open, MarkdownModel.Header2)
			.Replace(BBCodeModel.Header2Close, MarkdownModel.Empty)
			.Replace(BBCodeModel.Header3Open, MarkdownModel.Header3)
			.Replace(BBCodeModel.Header3Close, MarkdownModel.Empty)
			.Replace(BBCodeModel.SpoilerOpen, MarkdownModel.Empty)
			.Replace(BBCodeModel.SpoilerClose, MarkdownModel.Empty)
			.Replace(BBCodeModel.ListOpen, MarkdownModel.Empty)
			.Replace(BBCodeModel.ListClose, MarkdownModel.Empty)
			.Replace("[/]", MarkdownModel.Empty)
			.Replace("[/*]", MarkdownModel.Empty);

		if (steamContent)
		{
			sb.Replace("{STEAM_CLAN_IMAGE}", "https://cdn.akamai.steamstatic.com/steamcommunity/public/images/clans/");
		}
		var parsedString = sb.ToString();
		return parsedString;
	}

	public string ConvertBBCodeToMarkdown(string input)
	{
		foreach (var pattern in BBCodeRegexPatterns.Patterns.Keys)
		{
			input = Regex.Replace(input, pattern, BBCodeRegexPatterns.Patterns[pattern], RegexOptions.IgnoreCase | RegexOptions.Multiline);
		}
		return input;
	}
}
