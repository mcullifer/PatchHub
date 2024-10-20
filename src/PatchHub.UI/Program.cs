using LettuceEncrypt;
using MudBlazor.Services;
using PatchHub.Infrastructure;

namespace PatchHub.UI;

public class Program
{
	public static void Main(string[] args)
	{
		var builder = WebApplication.CreateBuilder(args);

		// Add services to the container.
		builder.Services.AddRazorPages();
		builder.Services.AddServerSideBlazor();
		builder.Services.AddMudServices();
		builder.Services.AddInfrastructureServices();
		builder.Services.AddLettuceEncrypt()
			.PersistDataToDirectory(new DirectoryInfo("/apidata/LettuceEncrypt"), null);

		var app = builder.Build();

		// Configure the HTTP request pipeline.
		if (!app.Environment.IsDevelopment())
		{
			app.UseExceptionHandler("/Error");
			// The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
			//app.UseHsts();
		}
		app.UseRouting();
		app.UseHttpsRedirection();
		app.UseStaticFiles();
		app.MapBlazorHub();
		app.MapFallbackToPage("/_Host");

		app.Run();
	}
}