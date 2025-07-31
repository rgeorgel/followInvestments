using System.ComponentModel.DataAnnotations;

namespace FollowInvestments.Api.Models;

public class ExchangeRate
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public string FromCurrency { get; set; } = string.Empty;
    
    [Required]
    public string ToCurrency { get; set; } = string.Empty;
    
    [Required]
    public decimal Rate { get; set; }
    
    [Required]
    public DateTime LastUpdated { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Computed property for currency pair symbol (e.g., "CADUSD=X")
    public string CurrencyPair => $"{FromCurrency}{ToCurrency}=X";
}