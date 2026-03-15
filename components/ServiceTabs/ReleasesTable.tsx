/* eslint-disable no-unused-vars */

import React from 'react';
import { formatLocalDateTime, formatRelativeTime } from '../../lib/time';
import { Build } from '../../types/service';


type Props = {
  filteredBuilds: Build[];
  setDataModal: (data: unknown) => void;
};

const SHORT_COMMIT_LENGTH = 7;

export const truncateCommit = (commit?: string) => {
  if (!commit) return '-';
  return commit.length > SHORT_COMMIT_LENGTH
    ? commit.slice(0, SHORT_COMMIT_LENGTH)
    : commit;
};


export default function ReleasesTable({
  filteredBuilds,
  setDataModal,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Commit</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Published</th>
              <th className="px-4 py-3 font-medium">Archive</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredBuilds.length > 0 ? (
              filteredBuilds.map((b, index) => {
                const published = b.published_at
                  ? new Date(b.published_at)
                  : null;

                return (
                  <tr
                    key={b.id}
                    className={`
                        transition-colors
                        ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-900/40'}
                        hover:bg-gray-100/70 dark:hover:bg-gray-800/60
                      `}
                  >
                    <td className="px-4 py-3 align-middle text-gray-700 dark:text-gray-300">
                      {b.id}
                    </td>

                    <td className="px-4 py-3 align-top">
                      {b.source === "github" ? (
                        <div className="space-y-1 min-w-[200px] max-w-[280px]">

                          {/* Commit SHA */}
                          {b.commit_id && (
                            <span
                              className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-mono text-xs text-gray-700 dark:text-gray-300"
                              title={b.commit_id}
                            >
                              {truncateCommit(b.commit_id)}
                            </span>
                          )}

                          {/* Commit message OR informational label */}
                          {b.data?.head_commit?.message ? (
                            <div
                              className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1"
                              title={b.data.head_commit.message}
                            >
                              {b.data.head_commit.message}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 italic">
                              Manual trigger – no commit message
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {truncateCommit(b.commit_id)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-middle text-gray-700 dark:text-gray-300">
                      {b.branch ?? '-'}
                    </td>

                    <td className="px-4 py-3 align-middle">
                      {b.source === "github" && b.actor ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">

                          {/* Avatar from actor */}
                          <img
                            src={`https://github.com/${b.actor}.png`}
                            alt="avatar"
                            className="w-5 h-5 rounded-full"
                          />

                          <span className="truncate max-w-[120px]">
                            {b.actor}
                          </span>

                        </div>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">
                          {b.actor ?? '-'}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 align-middle text-gray-500 dark:text-gray-400 text-xs"
                      title={
                        published
                          ? formatLocalDateTime(b.published_at)
                          : undefined
                      }
                    >
                      {published
                        ? formatRelativeTime(b.published_at)
                        : '-'}
                    </td>

                    <td className="px-4 py-3 align-middle space-y-1">
                      {b.archive && b.archive.length > 0 ? (
                        b.archive.map((a) => (
                          <div key={a.url}>
                            <a
                              href={a.url}
                              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {a.id ?? 'download'}
                            </a>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <button
                        onClick={() => setDataModal(b.data)}
                        className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No releases found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}