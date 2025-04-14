import { Source } from "./components/Tooltip";

export type GlassStyle = {
  base: string;
  card: string;
  input: string;
};

export type CellData = {
  value: string;
  sources?: Source[];
  enriched?: boolean;
  loading?: boolean;
};

export type SpreadsheetData = {
  headers: string[];
  rows: CellData[][];
};

export type Position = {
  row: number;
  col: number;
};
