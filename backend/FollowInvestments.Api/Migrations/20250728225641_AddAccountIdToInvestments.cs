using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FollowInvestments.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountIdToInvestments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Investments_Accounts_AccountId",
                table: "Investments");

            migrationBuilder.AddForeignKey(
                name: "FK_Investments_Accounts_AccountId",
                table: "Investments",
                column: "AccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Investments_Accounts_AccountId",
                table: "Investments");

            migrationBuilder.AddForeignKey(
                name: "FK_Investments_Accounts_AccountId",
                table: "Investments",
                column: "AccountId",
                principalTable: "Accounts",
                principalColumn: "Id");
        }
    }
}
