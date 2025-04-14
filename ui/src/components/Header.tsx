import React from "react";
import { Github, Download } from "lucide-react";
import { exportToCSV } from "../utils";
import { SpreadsheetData } from "../types";

interface HeaderProps {
  glassStyle: string;
  data: SpreadsheetData;
}

const sampleData: SpreadsheetData = {
  headers: ["Header1", "Header2", "Header3"],
  rows: [
    [{ value: "Row1Col1" }, { value: "Row1Col2" }, { value: "Row1Col3" }],
    [{ value: "Row2Col1" }, { value: "Row2Col2" }, { value: "Row2Col3" }],
  ],
};

const Header: React.FC<HeaderProps> = ({ glassStyle, data }) => {
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    console.error("Failed to load Tavily logo");
    console.log("Image path:", e.currentTarget.src);
    e.currentTarget.style.display = "none";
  };

  return (
    <div className="relative mb-16">
      <div className="text-center pt-4">
        <h1 className="text-[48px] font-medium text-[#1a202c] font-['DM_Sans'] tracking-[-1px] leading-[52px] text-center mx-auto antialiased">
          Data Enrichment Agent
        </h1>
        <p className="text-gray-600 text-lg font-['DM_Sans'] mt-4 flex items-center justify-center">
          Enrich tabular data using Tavily and IBM® Granite
        </p>
      </div>
      <div className="absolute top-0 right-0 flex items-center space-x-2">
        <button
          onClick={() => exportToCSV(data)}
          className={`bg-[#468BFF] text-white hover:bg-[#8FBCFA] transition-colors rounded-lg flex items-center justify-center gap-2 text-sm`}
          style={{ width: "auto", height: "40px", padding: "8px 12px" }}
          aria-label="Export to CSV"
        >
          <Download style={{ width: "16px", height: "auto" }} />
          Export
        </button>
        <a
          href="https://tavily.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-gray-600 hover:bg-gray-100 transition-colors ${glassStyle} rounded-lg flex items-center justify-center`}
          style={{ width: "40px", height: "40px", padding: "8px" }}
          aria-label="Tavily Website"
        >
          <img
            src="/tavilylogo.svg"
            alt="Tavily Logo"
            className="w-full h-full object-contain"
            style={{
              width: "24px",
              height: "24px",
              display: "block",
              margin: "auto",
            }}
            onError={handleImageError}
          />
        </a>
        <a
          href="https://github.com/pogjester/company-research-agent"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-gray-600 hover:bg-gray-100 transition-colors ${glassStyle} rounded-lg flex items-center justify-center`}
          style={{ width: "40px", height: "40px", padding: "8px" }}
          aria-label="GitHub Profile"
        >
          <Github
            style={{
              width: "24px",
              height: "24px",
              display: "block",
              margin: "auto",
            }}
          />
        </a>
        <a
          href="https://www.ibm.com/granite"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-gray-600 hover:bg-gray-100 transition-colors ${glassStyle} rounded-lg flex items-center justify-center`}
          style={{ width: "40px", height: "40px", padding: "8px" }}
          aria-label="Granite Logo"
        >
          <img
            src="/granitelogo.png"
            alt="Granite Logo"
            className="w-full h-full object-contain"
            style={{
              width: "100px",
              height: "auto",
              display: "block",
              margin: "auto 5px",
            }}
            onError={handleImageError}
          />
        </a>
      </div>
    </div>
  );
};

export default Header;
