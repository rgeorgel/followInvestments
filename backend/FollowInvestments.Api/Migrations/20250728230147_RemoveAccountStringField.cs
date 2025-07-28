using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FollowInvestments.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAccountStringField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Changes already applied manually:
            // - Account column dropped
            // - AccountId column made NOT NULL
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "AccountId",
                table: "Investments",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "Account",
                table: "Investments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }
    }
}
