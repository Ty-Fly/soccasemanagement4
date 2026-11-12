using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class Basis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Cases",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "AssignedToUserId",
                table: "Cases",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HandoverReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HandoverReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TimelineEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    CaseId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AuthorUserId = table.Column<int>(type: "int", nullable: true),
                    IsInternal = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimelineEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineEntries_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimelineEntries_Users_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cases_AssignedToUserId",
                table: "Cases",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEntries_AuthorUserId",
                table: "TimelineEntries",
                column: "AuthorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEntries_CaseId_CreatedAt",
                table: "TimelineEntries",
                columns: new[] { "CaseId", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Cases_Users_AssignedToUserId",
                table: "Cases",
                column: "AssignedToUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cases_Users_AssignedToUserId",
                table: "Cases");

            migrationBuilder.DropTable(
                name: "HandoverReports");

            migrationBuilder.DropTable(
                name: "TimelineEntries");

            migrationBuilder.DropIndex(
                name: "IX_Cases_AssignedToUserId",
                table: "Cases");

            migrationBuilder.DropColumn(
                name: "AssignedToUserId",
                table: "Cases");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Cases",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(32)",
                oldMaxLength: 32);
        }
    }
}
