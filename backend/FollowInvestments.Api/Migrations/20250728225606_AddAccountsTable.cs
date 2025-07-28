using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FollowInvestments.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Changes already applied manually:
            // - Accounts table created
            // - AccountId column added to Investments
            // - Foreign key constraint added
            // - Index created
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Investments_Accounts_AccountId",
                table: "Investments");

            migrationBuilder.DropTable(
                name: "Accounts");

            migrationBuilder.DropIndex(
                name: "IX_Investments_AccountId",
                table: "Investments");

            migrationBuilder.DropColumn(
                name: "AccountId",
                table: "Investments");
        }
    }
}
