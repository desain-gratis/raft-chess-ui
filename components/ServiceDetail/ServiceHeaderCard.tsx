"use client";

import React from "react";
import { formatRelativeTime, formatLocalDateTime } from "../../lib/time";
import { Build, Service, ServiceJob } from "../../types/service";

type Props = {
  service: Service | null;
  loading: boolean;
  hasNewBuild: boolean;
  hasNewEnv: boolean;
  hasNewSecret: boolean;
  lastSuccessfulJob: ServiceJob | null;

  latestBuildVersion?: number | null;
  latestEnvVersion?: number | null;
  latestSecretVersion?: number | null;

  latestBuild?: Build | null;

  onCreateDeployment: () => void;
};

export default function ServiceHeaderCard({
  service,
  loading,
  lastSuccessfulJob,
  latestBuildVersion,
  latestEnvVersion,
  latestSecretVersion,
  hasNewBuild,
  hasNewEnv,
  hasNewSecret,
  latestBuild,
}: Props) {
  if (!service) {
    if (!loading) {
      return (
        <div className="text-sm text-gray-600">
          Service not found.
        </div>
      );
    }
    return null;
  }

  const deployedBuild = Number(lastSuccessfulJob?.request?.build_version ?? 0);
  const deployedEnv = Number(lastSuccessfulJob?.request?.env_version ?? 0);
  const deployedSecret = Number(lastSuccessfulJob?.request?.secret_version ?? 0);

  const renderVersionDiff = (
    current?: number | null,
    latest?: number | null
  ) => {
    if (latest === null || latest === undefined) return "-";

    if (current === null || current === undefined) {
      return <span className="text-amber-600">Not deployed</span>;
    }

    if (latest > current) {
      return (
        <>
          <span className="line-through opacity-60 mr-1">{current}</span>
          <span className="font-semibold">{latest}</span>
        </>
      );
    }

    return <span className="text-emerald-600">Up to date</span>;
  };

  const hasAnyUpdate = hasNewBuild || hasNewEnv || hasNewSecret;
  const isUpToDate =
    lastSuccessfulJob && !hasAnyUpdate;

  return (
    <div className="mb-6">
      <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-6 min-h-[280px]">

        {/* Header */}
        <div className="space-y-1">
          <div className="text-xl font-semibold tracking-tight">
            {service.name ?? service.id}
          </div>
          {service.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {service.description}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div>
            <span className="text-gray-400">Executable</span>
            <div className="font-mono text-xs break-all">
              {service.executable_path}
            </div>
          </div>

          <div>
            <span className="text-gray-400">Repository</span>
            <div className="font-mono text-xs">
              {service.repository?.namespace}/{service.repository?.id}
            </div>
          </div>

          {service.bound_addresses?.length! > 0 && (
            <div>
              <span className="text-gray-400">Ports</span>
              <div className="font-mono text-xs">
                {service.bound_addresses!
                  .map((b) => `${b.host}:${b.port}`)
                  .join(", ")}
              </div>
            </div>
          )}

          <div>
            <span className="text-gray-400">Updated</span>
            <div
              className="text-xs"
              title={formatLocalDateTime(service.published_at)}
            >
              {formatRelativeTime(service.published_at)}
            </div>
          </div>
        </div>

        {/* Status Section */}
        {!isUpToDate ? (
          <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-900/20 p-5">

            <div className="flex items-start justify-between gap-8">

              {/* Left */}
              <div className="flex-1 space-y-4">

                <div className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                  New configuration available
                </div>

                {/* Version Diff */}
                <div className="grid sm:grid-cols-3 gap-6 text-sm">

                  {/* BUILD */}
                  <div className="space-y-2">
                    <div className="text-gray-500 text-xs uppercase tracking-wide">
                      Build
                    </div>
                    <div>
                      {renderVersionDiff(
                        lastSuccessfulJob?.request?.build_version,
                        latestBuildVersion
                      )}
                    </div>

                    {latestBuild && (
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">

                        {/* Actor / Branch / Commit */}
                        <div className="flex items-center gap-2">

                          {latestBuild.source === "github" && latestBuild.actor && (
                            <img
                              src={`https://github.com/${latestBuild.actor}.png`}
                              alt="avatar"
                              className="w-4 h-4 rounded-full"
                            />
                          )}

                          <span>{latestBuild.actor ?? "-"}</span>

                          {latestBuild.branch && (
                            <>
                              <span>•</span>
                              <span>{latestBuild.branch}</span>
                            </>
                          )}

                          {latestBuild.commit_id && (
                            <>
                              <span>•</span>
                              <span className="font-mono">
                                {latestBuild.commit_id.slice(0, 7)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Commit Message */}
                        {latestBuild.source === "github" ? (
                          latestBuild.data?.head_commit?.message ? (
                            <div
                              className="text-gray-500 dark:text-gray-400 truncate max-w-[260px]"
                              title={latestBuild.data.head_commit.message}
                            >
                              {latestBuild.data.head_commit.message}
                            </div>
                          ) : (
                            <div className="text-gray-400 italic">
                              No commit message available
                            </div>
                          )
                        ) : (
                          <div className="text-gray-400 italic">
                            Build from internal source
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                  {/* ENV */}
                  <div className="space-y-2">
                    <div className="text-gray-500 text-xs uppercase tracking-wide">
                      Env
                    </div>
                    <div>
                      {renderVersionDiff(
                        lastSuccessfulJob?.request?.env_version,
                        latestEnvVersion
                      )}
                    </div>
                  </div>

                  {/* SECRET */}
                  <div className="space-y-2">
                    <div className="text-gray-500 text-xs uppercase tracking-wide">
                      Secret
                    </div>
                    <div>
                      {renderVersionDiff(
                        lastSuccessfulJob?.request?.secret_version,
                        latestSecretVersion
                      )}
                    </div>
                  </div>

                </div>

                {lastSuccessfulJob?.published_at && (
                  <div className="text-xs text-teal-700 dark:text-teal-300 pt-3 border-t border-teal-200 dark:border-teal-800">
                    Last deployment{" "}
                    <span title={formatLocalDateTime(lastSuccessfulJob.published_at)}>
                      {formatRelativeTime(lastSuccessfulJob.published_at)}
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 p-5 space-y-3 hidden">
            <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              ✓ All components are up to date
            </div>

            <div className="grid sm:grid-cols-3 gap-6 text-xs text-emerald-700 dark:text-emerald-300">
              <div>Build: {deployedBuild}</div>
              <div>Env: {deployedEnv}</div>
              <div>Secret: {deployedSecret}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}