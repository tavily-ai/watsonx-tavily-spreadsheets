import { SpreadsheetData } from "./types";

export const exportToCSV = (data: SpreadsheetData) => {
  // Convert headers to CSV format
  const csvHeaders = data.headers.join(",");

  // Convert rows to CSV format
  const csvRows = data.rows.map((row) =>
    row
      .map((cell) => `"${cell.value.replace(/"/g, '""')}"`) // Escape quotes
      .join(",")
  );

  // Combine headers and rows
  const csvContent = [csvHeaders, ...csvRows].join("\n");

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "tavily-data-enrichment.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
