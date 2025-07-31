namespace FollowInvestments.Api.Services;

public interface ICurrencyService
{
    Task<decimal?> GetExchangeRateAsync(string fromCurrency, string toCurrency);
    Task UpdateAllExchangeRatesAsync();
    Task<decimal> ConvertCurrencyAsync(decimal amount, string fromCurrency, string toCurrency);
    Task<Dictionary<string, decimal>> GetAllCurrentRatesAsync();
}