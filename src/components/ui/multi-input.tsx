"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MultiInputProps = {
  /** Name of the hidden input that carries the joined value (newline-separated). */
  name: string;
  /** Optional initial lines. Accepts string[] or a newline-separated string. */
  initial?: string[] | string;
  placeholder?: string;
  /** Apply a monospaced look — handy for URLs / IDs. */
  mono?: boolean;
  /** Require at least one non-empty value (enforced on the first row). */
  requireFirst?: boolean;
  /** Minimum number of visible rows. Defaults to 1. */
  minRows?: number;
  /** Label for the add button (defaults to "Add"). */
  addLabel?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: React.HTMLInputTypeAttribute;
  /** Rendered alongside each row (e.g. helpful right-hand hint). */
  inputClassName?: string;
};

function toInitialRows(initial: MultiInputProps["initial"], minRows: number): string[] {
  let arr: string[] = [];
  if (Array.isArray(initial)) {
    arr = initial;
  } else if (typeof initial === "string") {
    arr = initial.split(/\r?\n/);
  }
  arr = arr.map((s) => s ?? "");
  if (arr.length < minRows) {
    arr = [...arr, ...Array.from({ length: minRows - arr.length }, () => "")];
  }
  if (arr.length === 0) arr = [""];
  return arr;
}

export function MultiInput({
  name,
  initial,
  placeholder,
  mono,
  requireFirst,
  minRows = 1,
  addLabel = "Add",
  inputMode,
  type = "text",
  inputClassName,
}: MultiInputProps) {
  const [rows, setRows] = useState<string[]>(() => toInitialRows(initial, minRows));

  const joined = useMemo(
    () =>
      rows
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n"),
    [rows],
  );

  const setRow = (i: number, v: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const addRow = () => setRows((prev) => [...prev, ""]);

  const removeRow = (i: number) => {
    setRows((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, idx) => idx !== i);
    });
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {rows.map((value, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input
              type={type}
              inputMode={inputMode}
              value={value}
              onChange={(e) => setRow(i, e.target.value)}
              placeholder={placeholder}
              required={requireFirst && i === 0}
              className={cn(mono && "font-mono text-xs", inputClassName)}
              aria-label={`${name} ${i + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeRow(i)}
              aria-label={`Remove ${name} ${i + 1}`}
              disabled={rows.length === 1 && !value}
              className="text-muted-foreground hover:text-destructive"
            >
              <span aria-hidden className="text-base leading-none">
                ×
              </span>
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRow}
          className="text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden className="text-base leading-none">
            +
          </span>
          <span>{addLabel}</span>
        </Button>
      </div>
      <input type="hidden" name={name} value={joined} readOnly />
    </div>
  );
}
