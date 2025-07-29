using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FollowInvestments.Api.Models;

public class StockPrice
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string Symbol { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "date")]
    public DateOnly PriceDate { get; set; }

    [Column(TypeName = "decimal(15,4)")]
    public decimal? OpenPrice { get; set; }

    [Column(TypeName = "decimal(15,4)")]
    public decimal? HighPrice { get; set; }

    [Column(TypeName = "decimal(15,4)")]
    public decimal? LowPrice { get; set; }

    [Required]
    [Column(TypeName = "decimal(15,4)")]
    public decimal ClosePrice { get; set; }

    public long? Volume { get; set; }

    [MaxLength(3)]
    public string? Currency { get; set; }

    [MaxLength(10)]
    public string? ExchangeName { get; set; }

    [Column(TypeName = "timestamp without time zone")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column(TypeName = "timestamp without time zone")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class StockPriceSearchRequest
{
    [Required]
    [MaxLength(20)]
    public string Symbol { get; set; } = string.Empty;

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool ForceRefresh { get; set; } = false;
}

public class YahooFinanceResponse
{
    public Chart Chart { get; set; } = new();
}

public class Chart
{
    public List<ChartResult> Result { get; set; } = new();
    public ChartError? Error { get; set; }
}

public class ChartResult
{
    public Meta Meta { get; set; } = new();
    public List<long> Timestamp { get; set; } = new();
    public Indicators Indicators { get; set; } = new();
}

public class Meta
{
    public string Currency { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string ExchangeName { get; set; } = string.Empty;
    public decimal? RegularMarketPrice { get; set; }
    public decimal? PreviousClose { get; set; }
    public long? RegularMarketTime { get; set; }
}

public class Indicators
{
    public List<Quote> Quote { get; set; } = new();
}

public class Quote
{
    public List<decimal?> Open { get; set; } = new();
    public List<decimal?> High { get; set; } = new();
    public List<decimal?> Low { get; set; } = new();
    public List<decimal?> Close { get; set; } = new();
    public List<long?> Volume { get; set; } = new();
}

public class ChartError
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}