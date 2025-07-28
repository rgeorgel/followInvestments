using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
    [MaxLength(100)]
    public string Account { get; set; } = string.Empty;

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
    Bonds
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
    [MaxLength(100)]
    public string Account { get; set; } = string.Empty;
}