import React, {
  useState,
  useRef,
  useEffect,
  SetStateAction,
  Dispatch,
} from "react";
import { SpreadsheetData, Position } from "../types";
import { Sparkles, Trash2, Pencil, Plus, Info } from "lucide-react";
import { motion } from "framer-motion";
import { ToastDetail } from "../App";
import SourcesTooltip from "./Tooltip";

interface SpreadsheetProps {
  data: SpreadsheetData;
  setData: Dispatch<SetStateAction<SpreadsheetData>>;
  setToast: Dispatch<SetStateAction<ToastDetail>>;
}

// Add API URL from environment
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Spreadsheet: React.FC<SpreadsheetProps> = ({
  setToast,
  data,
  setData,
}) => {
  const [activeCell, setActiveCell] = useState<Position | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tooltipOpenCell, setTooltipOpenCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Add a new row
  const addRow = () => {
    const newRows = [...data.rows];
    newRows.push(Array(data.headers.length).fill({ value: "" }));
    setData({ ...data, rows: newRows });
  };

  // Add a new column
  const addColumn = () => {
    if (data.headers.length >= 5) return; // Limit to 5 columns

    const newHeaders = [...data.headers, ""];
    const newRows = data.rows.map((row) => [...row, { value: "" }]);
    setData({ headers: newHeaders, rows: newRows });
  };

  // Delete a column
  const deleteColumn = (colIndex: number) => {
    if (data.headers.length <= 1) return; // Prevent deleting the last column

    const newHeaders = [...data.headers];
    newHeaders.splice(colIndex, 1);

    const newRows = data.rows.map((row) => {
      const newRow = [...row];
      newRow.splice(colIndex, 1);
      return newRow;
    });

    setData({ headers: newHeaders, rows: newRows });
  };

  // Focus on cell
  const focusCell = (row: number, col: number) => {
    if (tooltipOpenCell?.row === row && tooltipOpenCell?.col === col) {
      return; // If tooltip is open for this cell, don't trigger edit mode
    }

    setActiveCell({ row, col });
    setEditValue(data.rows[row][col].value);
    setIsEditing(true);
  };

  // Handle cell change
  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  // Save cell value
  const saveCell = () => {
    if (activeCell) {
      const { row, col } = activeCell;
      const newRows = [...data.rows];
      newRows[row][col] = {
        ...newRows[row][col],
        value: editValue,
        sources: [],
      };
      setData({ ...data, rows: newRows });
      setIsEditing(false);
      setActiveCell(null);
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === "Enter") {
        saveCell();
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setActiveCell(null);
      }
    }
  };

  // Enrichment function that calls our API
  const enrichColumn = async (colIndex: number) => {
    if (!data.headers[colIndex]) {
      setToast({
        message: "Please set the column header",
        type: "error",
        isShowing: true,
      });
      return;
    }
    // Set all cells in the column to loading state at once
    const newRows = data.rows.map((row) => {
      const newRow = [...row];
      if (newRow.some((cell) => cell.value?.length)) {
        newRow[colIndex] = { ...newRow[colIndex], loading: true };
      }
      return newRow;
    });
    setData({ ...data, rows: newRows });

    try {
      // Get context from other columns
      const contextValues: Record<string, string> = {};
      data.headers.forEach((header, idx) => {
        if (idx !== colIndex && header.trim() !== "") {
          contextValues[header] = data.rows[0][idx].value;
        }
      });

      // Extract all target values from first column
      const targetValues = data.rows.map((row) => row[0].value);

      // Make a single batch request
      const response = await fetch(`${API_URL}/api/enrich/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          column_name: data.headers[colIndex],
          rows: targetValues,
          context_values: contextValues,
        }),
      });

      if (!response.ok) {
        setToast({
          message: "Enrichment failed",
          type: "error",
          isShowing: true,
        });
        throw new Error("Batch enrichment failed");
      }

      const result = await response.json();

      // Update all cells at once with the enriched values
      const enrichedRows = data.rows.map((row, rowIndex) => {
        const newRow = [...row];
        newRow[colIndex] = {
          value: result.enriched_values[rowIndex],
          sources: result.sources[rowIndex],
          enriched: result.enriched_values[rowIndex] !== "",
          loading: false,
        };
        return newRow;
      });

      setData({ ...data, rows: enrichedRows });
      setToast({ message: "Cells enriched", type: "success", isShowing: true });
    } catch (error) {
      console.error("Error during enrichment:", error);
      // Reset loading state on error for all cells at once
      const errorRows = data.rows.map((row) => {
        const newRow = [...row];

        newRow[colIndex] = {
          ...newRow[colIndex],
          enriched: false,
          loading: false,
        };

        return newRow;
      });
      setData({ ...data, rows: errorRows });
      setToast({
        message: "Enrichment failed",
        type: "error",
        isShowing: true,
      });
    }
  };

  // Edit column header
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState("");
  const headerInputRef = useRef<HTMLInputElement>(null);

  const startEditingHeader = (index: number) => {
    setEditingHeader(index);
    setHeaderEditValue(data.headers[index]);
  };

  const saveHeaderEdit = () => {
    if (editingHeader !== null) {
      const newHeaders = [...data.headers];
      newHeaders[editingHeader] = headerEditValue;
      setData({ ...data, headers: newHeaders });
      setEditingHeader(null);
    }
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveHeaderEdit();
    } else if (e.key === "Escape") {
      setEditingHeader(null);
    }
  };

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Focus header input when editing header
  useEffect(() => {
    if (editingHeader !== null && headerInputRef.current) {
      headerInputRef.current.focus();
    }
  }, [editingHeader]);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full">
        <table
          ref={tableRef}
          className="w-full border-separate border-spacing-0"
        >
          <thead>
            <tr>
              <th className="w-14 bg-white border border-gray-200 p-2 text-left sticky left-0 top-0 z-20 first-cell"></th>
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className={`w-40 max-w-[150px] bg-white border border-gray-200 p-2 text-left relative h-12 ${
                    index === data.headers.length - 1 &&
                    data.headers.length === 5
                      ? "last-header"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center w-full">
                      {editingHeader === index ? (
                        <input
                          ref={headerInputRef}
                          type="text"
                          value={headerEditValue}
                          onChange={(e) => setHeaderEditValue(e.target.value)}
                          onBlur={saveHeaderEdit}
                          onKeyDown={handleHeaderKeyDown}
                          className="w-full text-sm bg-white font-medium outline-none focus:outline-none focus:ring-0 focus:border-transparent"
                          placeholder="Enter column name..."
                        />
                      ) : (
                        <div
                          className="flex items-center max-w-[140px]"
                          onClick={() => startEditingHeader(index)}
                        >
                          <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                            {header}
                          </span>
                          <button
                            className="ml-2 text-gray-400 hover:text-blue-500 p-1 rounded-full hover:bg-blue-50 transition-colors"
                            title="Edit column name"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                        onClick={() => deleteColumn(index)}
                        title="Delete column"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                        onClick={() => enrichColumn(index)}
                        title="Enrich column using Tavily"
                      >
                        <Sparkles size={14} />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
              {data.headers.length < 5 && (
                <th
                  className={`w-14 bg-white border border-gray-200 p-2 text-center ${
                    data.headers.length === 4 ? "last-header" : ""
                  }`}
                >
                  <button
                    onClick={addColumn}
                    className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors mx-auto"
                    title="Add column (max 5)"
                  >
                    <Plus size={16} />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-blue-50/30 transition-colors"
              >
                <td
                  className={`bg-white border border-gray-200 p-2 text-center font-medium sticky left-0 ${
                    rowIndex === data.rows.length - 1
                      ? "last-row-first-cell"
                      : ""
                  }`}
                >
                  {rowIndex + 1}
                </td>
                {row.map((cell, colIndex) => (
                  <motion.td
                    key={colIndex}
                    className={`max-w-[150px] bg-white border border-gray-200 p-2 relative overflow-visible ${
                      rowIndex === data.rows.length - 1 &&
                      colIndex === row.length - 1 &&
                      data.headers.length === 5
                        ? "last-cell"
                        : ""
                    }`}
                    onClick={() => focusCell(rowIndex, colIndex)}
                    data-enriched={cell.enriched ? "true" : "false"}
                  >
                    {activeCell?.row === rowIndex &&
                    activeCell?.col === colIndex &&
                    isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={handleCellChange}
                        onBlur={saveCell}
                        onKeyDown={handleKeyDown}
                        className="w-full h-full p-0 border-0 outline-none bg-transparent focus:outline-none focus:ring-0 focus:border-transparent"
                      />
                    ) : (
                      <motion.div
                        className="w-full h-full min-h-6 flex items-center justify-between"
                        initial={
                          cell.enriched ? { opacity: 0 } : { opacity: 1 }
                        }
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {cell.loading ? (
                          <div className="flex items-center justify-left w-full">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-2 text-sm text-gray-500">
                              Enriching...
                            </span>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`w-full
                              ${
                                cell.enriched
                                  ? "text-green-700 font-medium"
                                  : ""
                              }`}
                            >
                              {cell.value}
                            </span>

                            {cell.sources?.length ? (
                              <>
                                <SourcesTooltip
                                  sources={cell.sources}
                                  open={
                                    tooltipOpenCell?.row === rowIndex &&
                                    tooltipOpenCell?.col === colIndex
                                  }
                                  setOpen={(isOpen: boolean) => {
                                    console.log("isOpen", isOpen);
                                    setTooltipOpenCell(
                                      isOpen
                                        ? { row: rowIndex, col: colIndex }
                                        : null
                                    );
                                  }}
                                />
                              </>
                            ) : null}
                          </>
                        )}
                      </motion.div>
                    )}
                  </motion.td>
                ))}
                {data.headers.length < 5 && (
                  <td
                    className={`w-14 bg-white border border-gray-200 p-2 text-center ${
                      rowIndex === data.rows.length - 1 ? "last-cell" : ""
                    }`}
                  ></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div
          className="mt-2 bg-gray-100 p-0 text-gray-400 text-center rounded-md hover:bg-gray-200 cursor-pointer transition-colors"
          onClick={addRow}
        >
          <button
            className="w-8 h-8 flex items-center justify-center transition-colors mx-auto"
            title="Add row"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Spreadsheet;
