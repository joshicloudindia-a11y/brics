import { useState, useMemo } from "react";

/**
 * Custom hook for handling sorting functionality
 * @param {Array} data - The data array to sort
 * @param {Object} sortConfig - Configuration for custom sort value extraction
 * @param {Object} defaultSort - Default sort configuration { column: string, order: 'asc'|'desc' }
 * @returns {Object} - Sorting state and methods
 */
const useSorting = (data = [], sortConfig = {}, defaultSort = null) => {
  const [sortColumn, setSortColumn] = useState(defaultSort?.column || null);
  const [sortOrder, setSortOrder] = useState(defaultSort?.order || "asc"); // 'asc' or 'desc'

  /**
   * Handle column sorting - toggle order if same column, otherwise set new column
   * @param {string} column - Column name to sort by
   */
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  /**
   * Generic function to extract sortable value from data item
   * @param {Object} item - Data item to extract value from
   * @param {string} column - Column name
   * @returns {any} - Sortable value
   */
  const getSortValue = (item, column) => {
    // Use custom sort config if provided
    if (sortConfig[column]) {
      return sortConfig[column](item);
    }

    // Default extraction logic for common patterns
    const value = item[column];
    
    if (value === null || value === undefined) {
      return "";
    }

    // Handle different data types
    if (typeof value === "string") {
      return value.toLowerCase();
    }
    
    if (typeof value === "number") {
      return value;
    }
    
    if (typeof value === "boolean") {
      return value ? "yes" : "no";
    }
    
    if (value instanceof Date) {
      return value.getTime();
    }

    // For nested objects, convert to string
    return String(value).toLowerCase();
  };

  /**
   * Apply sorting to data array
   */
  const sortedData = useMemo(() => {
    if (!sortColumn || !data.length) return data;

    const sortedArray = [...data];
    sortedArray.sort((a, b) => {
      const valueA = getSortValue(a, sortColumn);
      const valueB = getSortValue(b, sortColumn);

      // Handle numeric comparison
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }

      // Handle string comparison
      if (valueA < valueB) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sortedArray;
  }, [data, sortColumn, sortOrder, sortConfig]);

  /**
   * Reset sorting to initial state
   */
  const resetSort = () => {
    setSortColumn(null);
    setSortOrder("asc");
  };

  /**
   * Check if a column is currently being sorted
   * @param {string} column - Column name to check
   * @returns {boolean}
   */
  const isColumnSorted = (column) => sortColumn === column;

  /**
   * Get current sort info for a column
   * @param {string} column - Column name
   * @returns {Object} - Sort info { isActive, order }
   */
  const getColumnSortInfo = (column) => ({
    isActive: sortColumn === column,
    order: sortColumn === column ? sortOrder : null,
  });

  return {
    // State
    sortColumn,
    sortOrder,
    sortedData,
    
    // Methods
    handleSort,
    resetSort,
    isColumnSorted,
    getColumnSortInfo,
    
    // Utilities
    getSortValue,
  };
};

export default useSorting;