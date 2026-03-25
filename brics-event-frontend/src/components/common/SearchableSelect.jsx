import React, { useEffect, useMemo, useRef, useState } from "react";

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Select",
  className = "",
  searchable = true,
  sort = true,
  maxVisible = 5,
  id,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const instanceId = useRef(id || `searchable-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const onDocDown = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // Close when another SearchableSelect instance opens
  useEffect(() => {
    const onOtherOpen = (e) => {
      const otherId = e?.detail?.id;
      if (!otherId) return;
      if (otherId !== instanceId.current) setOpen(false);
    };
    window.addEventListener("searchable-select-open", onOtherOpen);
    return () => window.removeEventListener("searchable-select-open", onOtherOpen);
  }, []);

  const sorted = useMemo(() => {
    const copy = Array.isArray(options) ? [...options] : [];
    if (sort) {
      copy.sort((a, b) => {
        const A = (a.label || a.value || "").toString().toLowerCase();
        const B = (b.label || b.value || "").toString().toLowerCase();
        return A.localeCompare(B);
      });
    }
    return copy;
  }, [options, sort]);

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const q = search.toLowerCase();
    const matchedOptions = sorted.filter((o) => {
      return (o.label || o.value || "").toString().toLowerCase().includes(q);
    });
    
    // If no matches found and "Others" exists in options, show "Others" as fallback
    if (matchedOptions.length === 0) {
      const othersOption = sorted.find(o => 
        (o.value || "").toString().toLowerCase() === "others" ||
        (o.label || "").toString().toLowerCase() === "others"
      );
      if (othersOption) {
        return [othersOption];
      }
    }
    
    return matchedOptions;
  }, [search, sorted]);

  const selected = useMemo(() => {
    return options.find((o) => o.value === value) || null;
  }, [options, value]);

  const handleSelect = (opt) => {
    if (onChange) onChange(opt.value);
    // notify others that this instance is opening/acting so they close
    window.dispatchEvent(new CustomEvent("searchable-select-open", { detail: { id: instanceId.current } }));
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={`relative`} id={id}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          const next = !open;
          if (next) {
            window.dispatchEvent(new CustomEvent("searchable-select-open", { detail: { id: instanceId.current } }));
          }
          setOpen(next);
        }}
        disabled={disabled}
        className={`w-full text-left px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] bg-white flex items-center justify-between text-base ${
          open ? "border-[var(--color-primary-blue)]" : "border-gray-300"
        } ${disabled ? "pointer-events-none opacity-60" : ""} ${className}`}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <svg
          className={`w-4 h-4 ml-2 transform ${open ? "rotate-180" : "rotate-0"}`}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M6 8l4 4 4-4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {searchable && (
            <div className="p-2">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none"
              />
            </div>
          )}

          <div
            style={{ maxHeight: `${maxVisible * 44}px`, overflowY: "auto" }}
            className="divide-y"
          >
            {filtered.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No results</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSelect(opt);
                  }
                }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  opt.value === value ? "bg-gray-100 font-medium" : ""
                }`}
              >
                <span className="truncate">{opt.label || opt.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
