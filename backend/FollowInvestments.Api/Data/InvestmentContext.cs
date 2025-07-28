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
        });
    }
}