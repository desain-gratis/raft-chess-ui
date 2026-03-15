import { useState, useEffect, useMemo } from "react";
import { DataFormat } from "../../../components/ServiceTabs/KeyValueEditor";
import { KV } from "../../../types/service";
import { getStandardizedTimestamp } from "../../../lib/time";

type SubmitMode = "update" | "revert";

type Options = {
    endpoint: string;
    namespace: string;
    service: string;
    initialVersions: KV[];
    refetch: () => Promise<void>;
};

export function useVersionedKeyValueResource({
    endpoint,
    namespace,
    service,
    initialVersions,
    refetch,
}: Options) {
    const [versions, setVersions] =
        useState<KV[]>(initialVersions);

    const [selectedVersionIndex, setSelectedVersionIndex] =
        useState(0);

    const [entries, setEntries] = useState<
        { key: string; value: any }[]
    >([]);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [format, setFormat] = useState<DataFormat>("kv");

    // Keep versions synced from parent
    useEffect(() => {
        setVersions(initialVersions);
    }, [initialVersions]);

    const selectedVersion = versions[selectedVersionIndex];
    const latestVersion = versions[0];

    const selectVersion = (index: number) => {
        setSelectedVersionIndex(index);
    };

    // Sync entries when version changes
    useEffect(() => {
        if (!selectedVersion) return;

        const kv = Object.entries(selectedVersion.value ?? {}).map(
            ([key, value]) => ({ key, value })
        );

        setEntries(kv);
    }, [selectedVersion]);

    const currentValue = useMemo(() => {
        return entries.reduce<Record<string, any>>((acc, e) => {
            if (e.key) acc[e.key] = e.value;
            return acc;
        }, {});
    }, [entries]);

    const selectedValue = selectedVersion?.value ?? {};
    const latestValue = latestVersion?.value ?? {};

    const isLatestSelected = selectedVersionIndex === 0;

    const isEdited =
        JSON.stringify(currentValue) !==
        JSON.stringify(selectedValue);

    const isSameAsLatest =
        JSON.stringify(currentValue) ===
        JSON.stringify(latestValue);

    let submitMode: SubmitMode | null = null;

    if (isEdited) {
        submitMode = "update";
    } else if (!isLatestSelected && !isSameAsLatest) {
        submitMode = "revert";
    }

    const hasChanges = submitMode !== null;
    const isReverting = submitMode === "revert";

    const submit = async () => {
        if (!hasChanges) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const optimisticVersion =
                latestVersion?.version ?? 0;

            const body = {
                ...latestVersion,
                namespace: namespace,
                service: service,
                version: undefined,
                value: {
                    ...currentValue,
                },
                published_at: getStandardizedTimestamp(),
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Namespace": namespace,
                    "DG-Optimistic-Lock-Version": String(
                        optimisticVersion
                    ),
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                let payload: any = null;

                try {
                    payload = await res.json();
                } catch {
                    throw new Error(`HTTP ${res.status}`);
                }

                const message =
                    extractApiErrorMessage(payload);

                throw new Error(message);
            }

            await refetch();
            setSelectedVersionIndex(0);

        } catch (err: any) {
            setError(
                err?.message || "Failed to update resource"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateEntry = (
        index: number,
        field: "key" | "value",
        value: any
    ) => {
        setEntries((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const addEntry = () => {
        setEntries((prev) => [
            ...prev,
            { key: "", value: "" },
        ]);
    };

    const removeEntry = (index: number) => {
        setEntries((prev) =>
            prev.filter((_, i) => i !== index)
        );
    };

    return {
        versions,
        selectedVersionIndex,
        selectVersion,

        format,
        setFormat,

        entries,
        updateEntry,
        addEntry,
        removeEntry,

        hasChanges,
        isReverting,
        submit,
        isSubmitting,
        error,
    };
}

function extractApiErrorMessage(
    payload: any
): string {
    if (!payload) return "Unknown error";

    if (
        payload.error &&
        Array.isArray(payload.error.errors) &&
        payload.error.errors.length > 0
    ) {
        return payload.error.errors
            .map(
                (e: any) =>
                    e.message || e.code || "Unknown error"
            )
            .join(" | ");
    }

    if (typeof payload.message === "string") {
        return payload.message;
    }

    return "Unexpected server error";
}