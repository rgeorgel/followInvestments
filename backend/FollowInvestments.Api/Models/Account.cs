using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FollowInvestments.Api.Models;

public class Account
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Goal1 { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Goal2 { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Goal3 { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Goal4 { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Goal5 { get; set; }

    public int SortOrder { get; set; } = 0;

    // Foreign key to User
    [Required]
    public int UserId { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public ICollection<Investment> Investments { get; set; } = new List<Investment>();
}

public class CreateAccountRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public decimal? Goal1 { get; set; }
    public decimal? Goal2 { get; set; }
    public decimal? Goal3 { get; set; }
    public decimal? Goal4 { get; set; }
    public decimal? Goal5 { get; set; }
    public int SortOrder { get; set; } = 0;
}

public class UpdateAccountRequest
{
    [Required]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public decimal? Goal1 { get; set; }
    public decimal? Goal2 { get; set; }
    public decimal? Goal3 { get; set; }
    public decimal? Goal4 { get; set; }
    public decimal? Goal5 { get; set; }
    public int SortOrder { get; set; } = 0;
}