using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FollowInvestments.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStockPriceTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StockPrices",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PriceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    OpenPrice = table.Column<decimal>(type: "numeric(15,4)", nullable: true),
                    HighPrice = table.Column<decimal>(type: "numeric(15,4)", nullable: true),
                    LowPrice = table.Column<decimal>(type: "numeric(15,4)", nullable: true),
                    ClosePrice = table.Column<decimal>(type: "numeric(15,4)", nullable: false),
                    Volume = table.Column<long>(type: "bigint", nullable: true),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    ExchangeName = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockPrices", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IDX_StockPrices_Date",
                table: "StockPrices",
                column: "PriceDate");

            migrationBuilder.CreateIndex(
                name: "IDX_StockPrices_Symbol",
                table: "StockPrices",
                column: "Symbol");

            migrationBuilder.CreateIndex(
                name: "IDX_StockPrices_Symbol_Date",
                table: "StockPrices",
                columns: new[] { "Symbol", "PriceDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockPrices");
        }
    }
}
