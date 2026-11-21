"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import FormControl from "@mui/material/FormControl";
import Icon from "@/components/admin/ui/Icon";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MDInput from "@/components/admin/components/MDInput";

/** A search box that reports its value after the person stops typing (default 350 ms). */
export function SearchField({
  value,
  onChange,
  placeholder = "Search",
  delayMs = 350,
  width = 260,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delayMs?: number;
  width?: number | string;
}) {
  const [text, setText] = useState(value);

  // Someone else reset the value (e.g. "Clear filters"): follow it.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onChange(text.trim()), delayMs);
    return () => clearTimeout(timer);
  }, [text, value, onChange, delayMs]);

  return (
    <MDInput
      size="small"
      placeholder={placeholder}
      value={text}
      onChange={(event: ChangeEvent<HTMLInputElement>) => setText(event.target.value)}
      sx={{ width }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Icon fontSize="small">search</Icon>
          </InputAdornment>
        ),
      }}
    />
  );
}

export interface Option<V extends string> {
  value: V;
  label: string;
}

/** A small select for list filters. `''` means "any". */
export function SelectFilter<V extends string>({
  label,
  value,
  options,
  onChange,
  anyLabel = "Any",
  width = 180,
}: {
  label: string;
  value: V | "";
  options: readonly Option<V>[];
  onChange: (value: V | "") => void;
  anyLabel?: string;
  width?: number;
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <FormControl size="small" sx={{ width }}>
      <InputLabel id={id} shrink>
        {label}
      </InputLabel>
      <Select
        labelId={id}
        label={label}
        notched
        displayEmpty
        value={value}
        onChange={(event: SelectChangeEvent<V | "">) => onChange(event.target.value as V | "")}
        sx={{ height: 40 }}
      >
        <MenuItem value="">{anyLabel}</MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
