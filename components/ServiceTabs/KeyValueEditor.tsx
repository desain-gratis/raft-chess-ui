/* eslint-disable no-unused-vars */
import React, { useMemo } from "react";
import YAML from "js-yaml";
import {
  formatRelativeTime,
  formatLocalDateTime,
} from "../../lib/time";
import { KV } from "../../types/service";

export type DataFormat = "kv" | "json" | "yaml";

type SubmitMode = "update" | "revert";

type Props = {
  title?: string;

  versions?: KV[];
  selectedVersionIndex?: number;
  onSelectVersion?: (index: number) => void;

  format: DataFormat;
  onFormatChange: (format: DataFormat) => void;

  entries: Record<string, any>[];
  onUpdateEntry: (
    index: number,
    field: "key" | "value",
    value: any
  ) => void;
  onAddEntry: () => void;
  onRemoveEntry: (index: number) => void;

  emptyMessage?: string;

  onSubmit?: (payload: {
    value: Record<string, any>;
    mode: SubmitMode;
  }) => void;

  isSubmitting?: boolean;
  error?: string | null;
};

const flatToNested = (
  flatObj: Record<string, any>
): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(
    flatObj
  )) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
};

export default function KeyValueEditor({
  title = "Key Value Editor",
  versions = [],
  selectedVersionIndex = 0,
  onSelectVersion,
  format,
  onFormatChange,
  entries,
  onUpdateEntry,
  onAddEntry,
  onRemoveEntry,
  emptyMessage = "No data available",
  onSubmit,
  isSubmitting = false,
  error,
}: Props) {

  const safeVersions: KV[] = versions.length
    ? versions
    : [
      {
        version: 0,
        value: {},
        published_at: null,
      } as unknown as KV,
    ];

  const selectedVersion = safeVersions[selectedVersionIndex];
  const latestVersion = safeVersions[0];

  const selectedValue = selectedVersion?.value ?? {};
  const latestValue = latestVersion?.value ?? {};

  const currentValue = useMemo(() => {
    return entries.reduce<Record<string, any>>(
      (acc, e) => {
        if (e.key) acc[e.key] = e.value;
        return acc;
      },
      {}
    );
  }, [entries]);

  const isLatestSelected =
    selectedVersionIndex === 0;

  const isEdited = useMemo(() => {
    return (
      JSON.stringify(currentValue) !==
      JSON.stringify(selectedValue)
    );
  }, [currentValue, selectedValue]);

  const isSameAsLatest = useMemo(() => {
    return (
      JSON.stringify(currentValue) ===
      JSON.stringify(latestValue)
    );
  }, [currentValue, latestValue]);

  let submitMode: SubmitMode | null = null;

  if (isEdited) {
    submitMode = "update";
  } else if (!isLatestSelected && !isSameAsLatest) {
    submitMode = "revert";
  }

  const hasChanges = submitMode !== null;
  const isReverting = submitMode === "revert";

  const handleSubmit = () => {
    if (!onSubmit || !submitMode) return;

    onSubmit({
      value: currentValue,
      mode: submitMode,
    });
  };


  return (
    <div>
      <h3 className="text-lg font-medium mb-4">
        {title}
      </h3>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
          {/* Header Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {onSelectVersion && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Version
                </label>
                <select
                  value={selectedVersionIndex}
                  onChange={(e) =>
                    onSelectVersion?.(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                >
                  {versions.length === 0 ? (
                    <option value={0}>No previous history yet</option>
                  ) : (
                    versions.map((v, idx) => (
                      <option key={idx} value={idx}>
                        Version {v.version}
                        {v.published_at && (
                          <>
                            {" "}
                            (published {formatRelativeTime(v.published_at)} ·{" "}
                            {formatLocalDateTime(v.published_at)})
                          </>
                        )}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) =>
                  onFormatChange(
                    e.target.value as DataFormat
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
              >
                <option value="kv">
                  Key-Value
                </option>
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {format === "kv" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 font-medium">Value</th>
                    <th className="px-4 py-3 font-medium text-right w-24">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {entries.length > 0 ? (
                    entries.map((entry, idx) => (
                      <tr
                        key={idx}
                        className={`
                  transition-colors
                  ${idx % 2 === 0
                            ? "bg-white dark:bg-gray-900"
                            : "bg-gray-50/40 dark:bg-gray-900/40"
                          }
                  hover:bg-gray-100/70 dark:hover:bg-gray-800/60
                `}
                      >
                        <td className="px-4 py-3 align-middle">
                          <input
                            type="text"
                            value={entry.key}
                            onChange={(e) =>
                              onUpdateEntry(idx, "key", e.target.value)
                            }
                            className="w-full bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                            placeholder="KEY_NAME"
                          />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <input
                            type="text"
                            value={String(entry.value ?? "")}
                            onChange={(e) =>
                              onUpdateEntry(
                                idx,
                                "value",
                                e.target.value
                              )
                            }
                            className="w-full bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                            placeholder="Value"
                          />
                        </td>

                        <td className="px-4 py-3 align-middle text-right">
                          <button
                            onClick={() => onRemoveEntry(idx)}
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No key-value entries
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={onAddEntry}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                + Add Entry
              </button>
            </div>
          </div>
        )}


        {format === "json" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
                JSON View
              </span>
            </div>

            <div className="overflow-auto max-h-[400px]">
              <pre className="px-4 py-4 text-xs font-mono leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {JSON.stringify(currentValue, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {format === "yaml" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
                YAML View
              </span>
            </div>

            <div className="overflow-auto max-h-[400px]">
              <pre className="px-4 py-4 text-xs font-mono leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {YAML.dump(flatToNested(currentValue))}
              </pre>
            </div>
          </div>
        )}

      </div>

      {/* Submit Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!hasChanges || isSubmitting}
          className={`
            px-4 py-2 rounded text-sm font-medium
            ${!hasChanges
              ? "bg-gray-300 text-gray-500"
              : "bg-blue-600 text-white hover:bg-blue-700"
            }
          `}
        >
          {isSubmitting
            ? "Updating..."
            : isReverting
              ? "Revert to this version"
              : "Update"}
        </button>
      </div>
    </div>
  );
}