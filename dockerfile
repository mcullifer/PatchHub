FROM mcr.microsoft.com/dotnet/aspnet:7.0 as base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:7.0 as build
WORKDIR /
COPY ["src/PatchHub.UI/PatchHub.UI.csproj", "src/PatchHub.UI/"]
COPY ["src/PatchHub.Infrastructure/PatchHub.Infrastructure.csproj", "src/PatchHub.Infrastructure/"]
COPY ["src/PatchHub.Parsers/PatchHub.Parsers.csproj", "src/PatchHub.Parsers/"]
COPY ["src/PatchHub.Infrastructure/steam-app-ids.json", "src/PatchHub.Infrastructure/"]
RUN dotnet restore "src/PatchHub.UI/PatchHub.UI.csproj"
COPY . .
WORKDIR "/src/PatchHub.UI"
RUN dotnet build "PatchHub.UI.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PatchHub.UI.csproj" -c Release -o /app/publish

FROM base as final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PatchHub.UI.dll"]
