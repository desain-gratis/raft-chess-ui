import React, { useEffect, useMemo, useState } from "react";
import { formatRelativeTime, formatLocalDateTime } from "../../lib/time";

export default function RoutingTab({
    versions = [],
    selectedVersionIndex = 0,
    onSelectVersion,
    onSubmit,
    isSubmitting,
    error,
}: any) {

    const hasVersions = versions && versions.length > 0;

    const selected = hasVersions ? versions[selectedVersionIndex] : null;
    const latest = hasVersions ? versions[0] : null;

    const [tunnelToken, setTunnelToken] = useState("");

    useEffect(() => {
        if (selected) {
            setTunnelToken(
                selected?.cloudflare_config?.tunnel_token ?? ""
            );
        }
    }, [selected]);

    const selectedToken =
        selected?.cloudflare_config?.tunnel_token ?? "";

    const latestToken =
        latest?.cloudflare_config?.tunnel_token ?? "";

    const isLatestSelected = selectedVersionIndex === 0;

    const isEdited = useMemo(() => {
        if (!hasVersions) return tunnelToken.length > 0;
        return tunnelToken !== selectedToken;
    }, [tunnelToken, selectedToken, hasVersions]);

    const isSameAsLatest = useMemo(() => {
        if (!hasVersions) return false;
        return tunnelToken === latestToken;
    }, [tunnelToken, latestToken, hasVersions]);

    let submitMode: "create" | "update" | "revert" | null = null;

    if (!hasVersions) {
        if (tunnelToken.length > 0) submitMode = "create";
    } else if (isEdited) {
        submitMode = "update";
    } else if (!isLatestSelected && !isSameAsLatest) {
        submitMode = "revert";
    }

    const hasChanges = submitMode !== null;
    const isReverting = submitMode === "revert";
    const isCreating = submitMode === "create";

    const handleSubmit = () => {
        if (!onSubmit || !submitMode) return;

        onSubmit({
            ...(selected || {}),
            cloudflare_config: {
                tunnel_token: tunnelToken,
            },
            mode: submitMode,
        });
    };

    return (
        <div>
            <h3 className="text-lg font-medium mb-4">
                Routing
            </h3>

            {error && (
                <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="space-y-4">

                {/* Controls */}
                <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* Version Selector */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Version
                            </label>

                            <select
                                value={selectedVersionIndex}
                                onChange={(e) =>
                                    onSelectVersion?.(Number(e.target.value))
                                }
                                disabled={!hasVersions}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm disabled:opacity-60"
                            >
                                {!hasVersions ? (
                                    <option value={0}>
                                        No previous history yet
                                    </option>
                                ) : (
                                    versions.map((v: any, i: number) => (
                                        <option key={v.version} value={i}>
                                            Version {v.version}
                                            {v.published_at && (
                                                <>
                                                    {" "}
                                                    (published{" "}
                                                    {formatRelativeTime(v.published_at)} ·{" "}
                                                    {formatLocalDateTime(v.published_at)})
                                                </>
                                            )}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                    </div>

                </div>

                {/* Token Editor */}
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">

                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
                            Cloudflare Tunnel Configuration
                        </span>
                    </div>

                    <div className="p-4">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Tunnel Token
                        </label>

                        <textarea
                            value={tunnelToken}
                            onChange={(e) =>
                                setTunnelToken(e.target.value)
                            }
                            rows={5}
                            placeholder="Enter Cloudflare tunnel token..."
                            className="
    w-full px-3 py-2 text-sm font-mono rounded
    border border-gray-300 dark:border-gray-700
    bg-white dark:bg-gray-900
    text-gray-800 dark:text-gray-100
    focus:outline-none focus:ring-2 focus:ring-blue-500
    resize-y
  "
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">

                    <div>
                        {selected?.published_at ? (
                            <>
                                Published{" "}
                                {formatRelativeTime(
                                    selected.published_at
                                )}
                            </>
                        ) : (
                            <span>No routing configuration exists yet.</span>
                        )}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!hasChanges || isSubmitting}
                        className={`
              px-4 py-2 rounded text-sm font-medium
              ${!hasChanges
                                ? "bg-gray-300 text-gray-500 "
                                : "bg-blue-600 text-white hover:bg-blue-700"}
            `}
                    >
                        {isSubmitting
                            ? "Updating..."
                            : isCreating
                                ? "Create Routing Config"
                                : isReverting
                                    ? "Revert to this version"
                                    : "Update"}
                    </button>

                </div>

            </div>
        </div>
    );
}