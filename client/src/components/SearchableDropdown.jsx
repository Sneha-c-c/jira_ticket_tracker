import React, { useMemo, useState } from 'react';
import './FilterBar.css';

/**
 * SearchableDropdown
 * PUBLIC_INTERFACE
 * Generic dropdown with:
 * - client-side search
 * - default 20-item limit (if limitDefault20 is true)
 * - ability to always show all (issue type, environment)
 * 
 * Props:
 *  - label: string
 *  - options: Array<{ value: string, label: string }>
 *  - value: string | string[] | null
 *  - onChange: (value) => void
 *  - multiple?: boolean
 *  - placeholder?: string
 *  - limitDefault20?: boolean (default true)
 *  - alwaysShowAll?: boolean (default false)
 */
export default function SearchableDropdown({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Select...',
  limitDefault20 = true,
  alwaysShowAll = false
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = options || [];
    const out = q ? base.filter(o => o.label.toLowerCase().includes(q)) : base;
    if (alwaysShowAll) return out;
    if (limitDefault20) return out.slice(0, 20);
    return out;
  }, [options, search, limitDefault20, alwaysShowAll]);

  const toggleValue = (val) => {
    if (!multiple) {
      onChange(val);
      return;
    }
    const curr = Array.isArray(value) ? value : [];
    if (curr.includes(val)) {
      onChange(curr.filter(v => v !== val));
    } else {
      onChange([...curr, val]);
    }
  };

  const isSelected = (val) => {
    if (multiple) return Array.isArray(value) && value.includes(val);
    return value === val;
  };

  return (
    <div className="filter-item">
      <label className="filter-label">{label}</label>
      <input
        type="text"
        className="filter-search"
        placeholder={`Search ${label}`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="dropdown-list">
        {filtered.map((o) => (
          <div
            key={o.value}
            className={`dropdown-option ${isSelected(o.value) ? 'selected' : ''}`}
            onClick={() => toggleValue(o.value)}
            title={o.label}
          >
            {o.label}
          </div>
        ))}
        {(!filtered || filtered.length === 0) && (
          <div className="dropdown-empty">No results</div>
        )}
      </div>
      {!multiple && (
        <div className="selected-value">
          {value ? options.find(o => o.value === value)?.label : placeholder}
        </div>
      )}
    </div>
  );
}
