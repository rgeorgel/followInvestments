FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 9900

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["FollowInvestments.Api.csproj", "./"]
RUN dotnet restore "FollowInvestments.Api.csproj"
COPY . .
RUN dotnet build "FollowInvestments.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "FollowInvestments.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "FollowInvestments.Api.dll"]
