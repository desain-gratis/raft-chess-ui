import { useState, useEffect, useMemo } from "react"
import { DataFormat } from "../../../components/ServiceTabs/KeyValueEditor"
import { getStandardizedTimestamp } from "../../../lib/time"

type SubmitMode = "update" | "revert"

export type RoutingVersion = {
    namespace: string
    service: string
    version: string
    cloudflare_config: Record<string, any>
    published_at: string
    url?: string
}

type Options = {
    endpoint: string
    namespace: string
    service: string
    initialVersions: RoutingVersion[]
    refetch: () => Promise<void>
}

export function useVersionedRoutingResource({
    endpoint,
    namespace,
    service,
    initialVersions,
    refetch,
}: Options) {

    const [versions, setVersions] =
        useState<RoutingVersion[]>(initialVersions)

    const [selectedVersionIndex, setSelectedVersionIndex] =
        useState(0)

    const [isSubmitting, setIsSubmitting] =
        useState(false)

    const [error, setError] =
        useState<string | null>(null)

    const [format, setFormat] =
        useState<DataFormat>("kv")

    useEffect(() => {
        setVersions(initialVersions)
    }, [initialVersions])

    const selectedVersion = versions[selectedVersionIndex]
    const latestVersion = versions[0]

    const selectVersion = (index: number) => {
        setSelectedVersionIndex(index)
    }

    const currentValue = useMemo(() => {
        return selectedVersion
    }, [selectedVersion])

    const selectedValue =
        selectedVersion?.cloudflare_config ?? {}

    const latestValue =
        latestVersion?.cloudflare_config ?? {}

    const isLatestSelected =
        selectedVersionIndex === 0

    const isEdited =
        JSON.stringify(currentValue) !==
        JSON.stringify(selectedValue)

    const isSameAsLatest =
        JSON.stringify(currentValue) ===
        JSON.stringify(latestValue)

    let submitMode: SubmitMode | null = null

    if (isEdited) {
        submitMode = "update"
    } else if (!isLatestSelected && !isSameAsLatest) {
        submitMode = "revert"
    }

    const hasChanges = submitMode !== null
    const isReverting = submitMode === "revert"

    const submit = async (value: any) => {
        if (!hasChanges) return

        setIsSubmitting(true)
        setError(null)

        try {

            const optimisticVersion =
                latestVersion?.version ?? "0"

            const body = {
                namespace: namespace,
                service: service,
                ...value,
                version: "",
                published_at: getStandardizedTimestamp(),
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Namespace": namespace,
                    "DG-Optimistic-Lock-Version":
                        optimisticVersion,
                },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                let payload: any = null

                try {
                    payload = await res.json()
                } catch {
                    throw new Error(`HTTP ${res.status}`)
                }

                throw new Error(
                    extractApiErrorMessage(payload)
                )
            }

            await refetch()

            setSelectedVersionIndex(0)

        } catch (err: any) {
            setError(
                err?.message || "Failed to update resource"
            )
        } finally {
            setIsSubmitting(false)
        }
    }



    return {
        versions,
        selectedVersionIndex,
        selectVersion,

        format,
        setFormat,

        hasChanges,
        isReverting,
        submit,
        isSubmitting,
        error,
    }
}

function extractApiErrorMessage(payload: any): string {

    if (!payload) return "Unknown error"

    if (
        payload.error &&
        Array.isArray(payload.error.errors) &&
        payload.error.errors.length > 0
    ) {
        return payload.error.errors
            .map(
                (e: any) =>
                    e.message ||
                    e.code ||
                    "Unknown error"
            )
            .join(" | ")
    }

    if (typeof payload.message === "string") {
        return payload.message
    }

    return "Unexpected server error"
}