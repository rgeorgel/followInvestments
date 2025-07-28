using Microsoft.EntityFrameworkCore;
using FollowInvestments.Api.Models;

namespace FollowInvestments.Api.Data;

public class InvestmentContext : DbContext
{
    public InvestmentContext(DbContextOptions<InvestmentContext> options) : base(options)
    {
    }

    public DbSet<Investment> Investments { get; set; }

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
        });
    }
}