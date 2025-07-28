using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FollowInvestments.Api.Migrations
{
    /// <inheritdoc />
    public partial class MigrateAccountData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create accounts from distinct account names in investments
            migrationBuilder.Sql(@"
                INSERT INTO ""Accounts"" (""Name"")
                SELECT DISTINCT ""Account""
                FROM ""Investments""
                WHERE ""Account"" IS NOT NULL AND ""Account"" != '';
            ");

            // Update investments to reference the proper AccountId
            migrationBuilder.Sql(@"
                UPDATE ""Investments""
                SET ""AccountId"" = a.""Id""
                FROM ""Accounts"" a
                WHERE ""Investments"".""Account"" = a.""Name"";
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
