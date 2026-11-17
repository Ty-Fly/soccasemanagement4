using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AlertIngestVelden : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {


            migrationBuilder.AddColumn<DateTime>(
                name: "DetectedAt",
                table: "Alerts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Alerts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RawPayload",
                table: "Alerts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
    name: "Severity",
    table: "Alerts",
    type: "nvarchar(16)",
    maxLength: 16,
    nullable: false,
    defaultValue: "Medium");   // was ""

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Alerts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "manual");   // was ""

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_TenantId_Source_ExternalId",
                table: "Alerts",
                columns: new[] { "TenantId", "Source", "ExternalId" },
                unique: true,
                filter: "[ExternalId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Alerts_TenantId_Source_ExternalId",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "DetectedAt",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "RawPayload",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "Severity",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Alerts");
        }
    }
}
