/* eslint-disable no-unused-vars */
import React from 'react';
import { formatRelativeTime, formatLocalDateTime, formatTimeDifference } from '../../lib/time';
import { Build } from '../../types/service';

type Props = {
  jobs: any[];
  builds: Build[];
  selectedJobIndex: number;
  setSelectedJobIndex: (..._args: any[]) => void;
  setDataModal: (..._args: any[]) => void;
  getStatusBadgeColor: (..._args: any[]) => string;
};

function getHostStatusColor(status?: string) {
  switch (status) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';

    case 'FAILED':
    case 'TIMEOUT':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';

    case 'CONFIGURING':
    case 'STARTING':
    case 'RESTARTING':
    case 'WAIT_READY':
    case 'ROUTING_TRAFFIC':
    case 'DRAIN_TRAFFIC':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';

    case 'CANCELLED':
      return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

    case 'PENDING':
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  }
}

function HostStatusTable({ job }: { job: any }) {
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);

  return (
    <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">
          Host Deployment Status
        </div>

        <div className="text-xs text-gray-500">
          {job.target?.length || 0} hosts
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[700px] w-full text-sm table-fixed">

          {/* Table Head */}
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-3 py-2 font-medium w-[180px]">
                Host
              </th>
              <th className="text-left px-3 py-2 font-medium w-[140px]">
                Configure
              </th>
              <th className="text-left px-3 py-2 font-medium w-[140px]">
                Restart
              </th>
              <th className="text-left px-3 py-2 font-medium">
                Error
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {job.target?.map((target: any, index: number) => {
              const configureStatus =
                job.configure_host_job?.status?.[target.host]?.status ||
                "PENDING";

              const restartStatus =
                job.restart_service_job?.status?.[target.host]?.status ||
                "PENDING";

              const errorMessage =
                job.configure_host_job?.status?.[target.host]?.error_message ||
                job.restart_service_job?.status?.[target.host]?.error_message ||
                "";

              const isExpanded = expandedRow === target.host;
              const hasError = !!errorMessage;

              return (
                <tr
                  key={target.host}
                  className={`align-top ${index !== job.target.length - 1
                    ? "border-b border-gray-200 dark:border-gray-700"
                    : ""
                    }`}
                >
                  {/* Host */}
                  <td className="px-3 py-4">
                    <div className="font-mono text-sm font-medium">
                      {target.host}
                    </div>

                    {target.architecture && (
                      <div className="text-xs text-gray-500 mt-1">
                        {target.os} • {target.architecture}
                      </div>
                    )}
                  </td>

                  {/* Configure Status */}
                  <td className="px-3 py-4 align-middle">
                    <div className="flex items-center h-full">
                      <span
                        className={`
        inline-flex items-center justify-center
        min-w-[90px]
        px-3 py-1.5
        rounded-full
        text-xs font-medium
        whitespace-nowrap
        transition-all duration-150 ease-out
        ${getHostStatusColor(configureStatus)}
      `}
                      >
                        {configureStatus}
                      </span>
                    </div>
                  </td>

                  {/* Restart Status */}
                  <td className="px-3 py-4 align-middle">
                    <div className="flex items-center h-full">
                      <span
                        className={`
        inline-flex items-center justify-center
        min-w-[90px]
        px-3 py-1.5
        rounded-full
        text-xs font-medium
        whitespace-nowrap
        transition-all duration-150 ease-out
        ${getHostStatusColor(restartStatus)}
      `}
                      >
                        {restartStatus}
                      </span>
                    </div>
                  </td>
                  {/* Error */}
                  <td className="px-3 py-4">
                    {!hasError ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : (
                      <div className="space-y-2">

                        <div
                          className={`
                            text-xs font-mono
                            bg-red-50/60 dark:bg-red-900/20
                            text-red-700 dark:text-red-300
                            border border-red-200 dark:border-red-800
                            rounded-lg
                            px-3 py-2
                            whitespace-pre-wrap
                            break-words
                            leading-relaxed
                            ${!isExpanded ? "line-clamp-3" : ""}
                          `}
                        >
                          {errorMessage}
                        </div>

                        {errorMessage.length > 140 && (
                          <button
                            onClick={() =>
                              setExpandedRow(
                                isExpanded ? null : target.host
                              )
                            }
                            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline decoration-dotted"
                          >
                            {isExpanded ? "Show less" : "Show full error"}
                          </button>
                        )}

                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>
    </div>
  );
}

export default function DeploymentTab({
  jobs,
  builds,
  selectedJobIndex,
  setSelectedJobIndex,
  setDataModal,
  getStatusBadgeColor,
}: Props) {
  const selectedJob = jobs[selectedJobIndex];
  const selectedBuild = builds?.find(
    (b: any) => Number(b.id) === Number(selectedJob?.request?.build_version)
  );

  const isGithubBuild =
    selectedBuild?.source === "github";

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Deployment History</h3>

      {jobs.length > 0 ? (
        <div className="space-y-4">
          {/* Job Selector */}
          <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">
                Job Selection
              </div>

              <div className="text-xs text-gray-500">
                {jobs.length} jobs
              </div>
            </div>

            {/* Select */}
            <div className="relative">
              <select
                value={selectedJobIndex}
                onChange={(e) => setSelectedJobIndex(Number(e.target.value))}
                className="
        w-full
        appearance-none
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-lg
        px-4 py-2.5
        pr-10
        text-sm
        focus:outline-none
        focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600
        transition-all duration-150
      "
              >
                {jobs.map((j, idx) => (
                  <option key={idx} value={idx}>
                    {j.id} • {formatRelativeTime(j.published_at)} • {j.status || "UNKNOWN"}
                  </option>
                ))}
              </select>

              {/* Custom Chevron */}
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          {selectedJob && (
            <div className="space-y-4">
              {/* Job Summary */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">

                {/* HEADER */}
                <div className="flex items-start justify-between gap-4">

                  <div className="space-y-1.5">
                    <div className="text-sm font-semibold">
                      Deployment #{selectedJob.id}
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                      <span
                        title={formatLocalDateTime(selectedJob.published_at)}
                        className="underline decoration-dotted cursor-help"
                      >
                        {formatRelativeTime(selectedJob.published_at)}
                      </span>

                      {selectedJob.finished_at && (
                        <>
                          <span className="opacity-50">•</span>
                          <span
                            title={
                              "Finished at: " +
                              formatLocalDateTime(selectedJob.finished_at)
                            }
                            className="underline decoration-dotted cursor-help"
                          >
                            {formatTimeDifference(
                              selectedJob.published_at,
                              selectedJob.finished_at
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium self-start ${getStatusBadgeColor(
                      selectedJob.status
                    )}`}
                  >
                    {selectedJob.status || "UNKNOWN"}
                  </span>
                </div>

                {/* VERSION ROW */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-6 text-sm">

                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Build</div>
                    <div className="font-medium">
                      {selectedJob.request?.build_version ?? "-"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Env</div>
                    <div className="font-medium">
                      {selectedJob.request?.env_version ?? "-"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Secret</div>
                    <div className="font-medium">
                      {selectedJob.request?.secret_version ?? "-"}
                    </div>
                  </div>

                </div>

                {/* GITHUB BUILD */}
                {isGithubBuild && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-start gap-3">

                    {/* Avatar from Actor */}
                    {selectedBuild.actor && (
                      <img
                        src={`https://github.com/${selectedBuild.actor}.png`}
                        alt="avatar"
                        className="w-7 h-7 rounded-full"
                      />
                    )}

                    <div className="min-w-0 space-y-1.5">

                      {/* Header row */}
                      <div className="flex items-center gap-2 text-sm flex-wrap">

                        {selectedBuild.actor && (
                          <span className="font-medium">
                            {selectedBuild.actor}
                          </span>
                        )}

                        {selectedBuild.branch && (
                          <span className="text-xs text-gray-500">
                            {selectedBuild.actor ? "pushed to" : "Branch"} {selectedBuild.branch}
                          </span>
                        )}

                        {!selectedBuild.data?.head_commit?.message && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            Manual Trigger
                          </span>
                        )}
                      </div>

                      {/* Commit message */}
                      {selectedBuild.data?.head_commit?.message ? (
                        <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {selectedBuild.data.head_commit.message}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          No commit message available.
                        </div>
                      )}

                      {/* SHA */}
                      {selectedBuild.commit_id && (
                        <div className="text-xs text-gray-500 font-mono">
                          {selectedBuild.commit_id.slice(0, 7)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Unified Host Table */}
              <HostStatusTable job={selectedJob} />

              {/* Raw JSON Button */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                <button
                  onClick={() => setDataModal(selectedJob)}
                  className="
      inline-flex items-center gap-2
      px-4 py-2
      text-sm font-medium
      rounded-lg
      border border-gray-300 dark:border-gray-600
      bg-white dark:bg-gray-900
      text-gray-700 dark:text-gray-300
      hover:bg-gray-100 dark:hover:bg-gray-800
      hover:border-gray-400 dark:hover:border-gray-500
      transition-all duration-150 ease-out
      focus:outline-none
      focus:ring-2 focus:ring-gray-400/40
      active:scale-[0.98]
    "
                >
                  View Raw JSON
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="text-blue-800 dark:text-blue-200 font-medium">
            No Deployment Jobs
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            This service has no deployment history yet.
          </div>
        </div>
      )}
    </div>
  );
}