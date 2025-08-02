using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Models;

namespace FollowInvestments.Api.Data;

public class InvestmentContext : DbContext
{
    public InvestmentContext(DbContextOptions<InvestmentContext> options) : base(options)
    {
    }

    public DbSet<Investment> Investments { get; set; }
    public DbSet<Account> Accounts { get; set; }
    public DbSet<StockPrice> StockPrices { get; set; }
    public DbSet<ExchangeRate> ExchangeRates { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Investment>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Currency)
                .HasConversion<string>();
                
            entity.Property(e => e.Category)
                .HasConversion<string>();
                
            entity.Property(e => e.Value)
                .HasColumnType("decimal(18,2)");
                
            entity.Property(e => e.Date)
                .HasColumnType("timestamp without time zone");

            // Configure relationship with Account
            entity.HasOne(e => e.Account)
                .WithMany(a => a.Investments)
                .HasForeignKey(e => e.AccountId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure relationship with User
            entity.HasOne(e => e.User)
                .WithMany(u => u.Investments)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(100);
                
            entity.Property(e => e.Goal1)
                .HasColumnType("decimal(18,2)");
            entity.Property(e => e.Goal2)
                .HasColumnType("decimal(18,2)");
            entity.Property(e => e.Goal3)
                .HasColumnType("decimal(18,2)");
            entity.Property(e => e.Goal4)
                .HasColumnType("decimal(18,2)");
            entity.Property(e => e.Goal5)
                .HasColumnType("decimal(18,2)");

            // Configure relationship with User
            entity.HasOne(e => e.User)
                .WithMany(u => u.Accounts)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StockPrice>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Symbol)
                .IsRequired()
                .HasMaxLength(20);
                
            entity.Property(e => e.PriceDate)
                .IsRequired()
                .HasColumnType("date");
                
            entity.Property(e => e.OpenPrice)
                .HasColumnType("decimal(15,4)");
                
            entity.Property(e => e.HighPrice)
                .HasColumnType("decimal(15,4)");
                
            entity.Property(e => e.LowPrice)
                .HasColumnType("decimal(15,4)");
                
            entity.Property(e => e.ClosePrice)
                .IsRequired()
                .HasColumnType("decimal(15,4)");
                
            entity.Property(e => e.Currency)
                .HasMaxLength(3);
                
            entity.Property(e => e.ExchangeName)
                .HasMaxLength(10);
                
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
                
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Unique constraint: one record per symbol per date
            entity.HasIndex(e => new { e.Symbol, e.PriceDate })
                .IsUnique()
                .HasDatabaseName("UK_Symbol_Date");
                
            // Performance indexes
            entity.HasIndex(e => new { e.Symbol, e.PriceDate })
                .HasDatabaseName("IDX_StockPrices_Symbol_Date");
                
            entity.HasIndex(e => e.Symbol)
                .HasDatabaseName("IDX_StockPrices_Symbol");
                
            entity.HasIndex(e => e.PriceDate)
                .HasDatabaseName("IDX_StockPrices_Date");
        });

        modelBuilder.Entity<ExchangeRate>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.FromCurrency)
                .IsRequired()
                .HasMaxLength(3);
                
            entity.Property(e => e.ToCurrency)
                .IsRequired()
                .HasMaxLength(3);
                
            entity.Property(e => e.Rate)
                .IsRequired()
                .HasColumnType("decimal(18,8)");
                
            entity.Property(e => e.LastUpdated)
                .HasColumnType("timestamp without time zone");
                
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Unique constraint: one record per currency pair
            entity.HasIndex(e => new { e.FromCurrency, e.ToCurrency })
                .IsUnique()
                .HasDatabaseName("UK_ExchangeRates_Currencies");
                
            // Performance index for lookups
            entity.HasIndex(e => new { e.FromCurrency, e.ToCurrency, e.LastUpdated })
                .HasDatabaseName("IDX_ExchangeRates_Lookup");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(100);
                
            entity.Property(e => e.Email)
                .IsRequired()
                .HasMaxLength(255);
                
            entity.Property(e => e.PasswordHash)
                .IsRequired();
                
            entity.Property(e => e.Role)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("user");
                
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
                
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Unique constraint on email
            entity.HasIndex(e => e.Email)
                .IsUnique()
                .HasDatabaseName("UK_Users_Email");
                
            // Performance index
            entity.HasIndex(e => e.Email)
                .HasDatabaseName("IDX_Users_Email");
        });
    }
}