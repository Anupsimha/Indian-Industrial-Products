import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { MapPin } from "lucide-react";

/**
 * LocationPicker: hierarchical State → City → Industrial Area picker.
 * value = { state, city, industrial_area }
 */
export const LocationPicker = ({ value = {}, onChange, required = false, testid = "loc-picker" }) => {
  const [tree, setTree] = useState({});

  useEffect(() => { api.get("/areas/tree").then((r) => setTree(r.data)).catch(() => {}); }, []);

  const states = Object.keys(tree);
  const cities = value.state ? Object.keys(tree[value.state] || {}) : [];
  const areas = (value.state && value.city) ? (tree[value.state]?.[value.city] || []) : [];

  return (
    <div className="space-y-2" data-testid={testid}>
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={value.state || ""} required={required}
          onChange={(v) => onChange?.({ state: v, city: "", industrial_area: "" })}
          options={states} placeholder="State" testid={`${testid}-state`}
        />
        <Select
          value={value.city || ""} required={required} disabled={!value.state}
          onChange={(v) => onChange?.({ ...value, city: v, industrial_area: "" })}
          options={cities} placeholder="City" testid={`${testid}-city`}
        />
        <Select
          value={value.industrial_area || ""} required={required} disabled={!value.city}
          onChange={(v) => onChange?.({ ...value, industrial_area: v })}
          options={areas} placeholder="Area" testid={`${testid}-area`}
        />
      </div>
      {value.industrial_area && (
        <div className="text-[11px] text-slate-500 inline-flex items-center gap-1">
          <MapPin size={11} /> {value.industrial_area}, {value.city}, {value.state}
        </div>
      )}
    </div>
  );
};

const Select = ({ value, onChange, options, placeholder, required, disabled, testid }) => (
  <select
    value={value} required={required} disabled={disabled}
    onChange={(e) => onChange?.(e.target.value)}
    data-testid={testid}
    className="rounded-lg border border-slate-300 px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50 disabled:text-slate-400"
  >
    <option value="">{placeholder}</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);
