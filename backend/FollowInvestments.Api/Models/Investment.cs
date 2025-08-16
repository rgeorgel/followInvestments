using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace FollowInvestments.Api.Models;

public class Investment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Value { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,4)")]
    public decimal Quantity { get; set; }

    [Required]
    public Currency Currency { get; set; }

    [Required]
    public DateTime Date { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public Category Category { get; set; }

    [Required]
    public int AccountId { get; set; }

    // Foreign key to User
    [Required]
    public int UserId { get; set; }

    // Navigation properties
    public Account Account { get; set; } = null!;
    public virtual User User { get; set; } = null!;

    public string Country => Currency == Currency.BRL ? "Brazil" : "Canada";
    
    public decimal Total => Quantity * Value;
}

public enum Currency
{
    BRL,
    CAD
}

public enum Category
{
    RendaFixa,
    Stocks,
    FIIs,
    ETF,
    Bonds,
    ManagedPortfolio,
    Cash,
    ManagedPortfolioBlock
}

public class CreateInvestmentRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public decimal Value { get; set; }

    [Required]
    public decimal Quantity { get; set; }

    [Required]
    public Currency Currency { get; set; }

    [Required]
    public DateTime Date { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public Category Category { get; set; }

    [Required]
    public int AccountId { get; set; }
}

public class UpdateInvestmentRequest
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public decimal Value { get; set; }

    [JsonPropertyName("quantity")]
    public decimal Quantity { get; set; }

    [JsonPropertyName("currency")]
    public Currency Currency { get; set; }

    [JsonPropertyName("date")]
    public DateTime Date { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public Category Category { get; set; }

    [JsonPropertyName("accountId")]
    public int AccountId { get; set; }
}