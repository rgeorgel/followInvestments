using FollowInvestments.Api.Services;

namespace FollowInvestments.Api.Services;

public class CurrencyUpdateBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CurrencyUpdateBackgroundService> _logger;
    private readonly TimeSpan _updateInterval = TimeSpan.FromHours(24); // Update every 24 hours
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(2); // Wait 2 minutes after startup

    public CurrencyUpdateBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<CurrencyUpdateBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Currency Update Background Service starting...");

        // Wait for initial delay to let the application start up properly
        await Task.Delay(_initialDelay, stoppingToken);

        // Update rates immediately on startup (if not fresh)
        await UpdateRatesWithRetry();

        // Then update every 24 hours
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_updateInterval, stoppingToken);
                await UpdateRatesWithRetry();
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Currency update service is stopping.");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in currency update service");
                // Continue running even if there's an error
            }
        }
    }

    private async Task UpdateRatesWithRetry()
    {
        const int maxRetries = 3;
        var delay = TimeSpan.FromMinutes(5);

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var currencyService = scope.ServiceProvider.GetRequiredService<ICurrencyService>();
                
                _logger.LogInformation("Updating exchange rates (attempt {Attempt}/{MaxRetries})...", attempt, maxRetries);
                await currencyService.UpdateAllExchangeRatesAsync();
                _logger.LogInformation("Exchange rates updated successfully");
                return; // Success, exit retry loop
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to update exchange rates (attempt {Attempt}/{MaxRetries})", attempt, maxRetries);
                
                if (attempt < maxRetries)
                {
                    _logger.LogInformation("Retrying in {Delay} minutes...", delay.TotalMinutes);
                    await Task.Delay(delay);
                    delay = TimeSpan.FromMinutes(delay.TotalMinutes * 2); // Exponential backoff
                }
                else
                {
                    _logger.LogError(ex, "Failed to update exchange rates after {MaxRetries} attempts", maxRetries);
                }
            }
        }
    }

    public override async Task StopAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Currency Update Background Service is stopping.");
        await base.StopAsync(stoppingToken);
    }
}