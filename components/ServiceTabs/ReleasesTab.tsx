/* eslint-disable no-unused-vars */
import React, { useMemo } from 'react';
import { Build } from '../../types/service';
import ReleasesTable from './ReleasesTable';

type Props = {
  builds: Build[];
  filteredBuilds: Build[];
  buildSearchText: string;
  setBuildSearchText: (value: string) => void;
  selectedBuildBranch: string | null;
  setSelectedBuildBranch: (value: string | null) => void;
  selectedBuildActor: string | null;
  setSelectedBuildActor: (value: string | null) => void;
  setDataModal: (data: unknown) => void;
};


export default function ReleasesTab({
  builds,
  filteredBuilds,
  buildSearchText,
  setBuildSearchText,
  selectedBuildBranch,
  setSelectedBuildBranch,
  selectedBuildActor,
  setSelectedBuildActor,
  setDataModal,
}: Props) {
  const branches = useMemo(
    () =>
      Array.from(
        new Set(builds.map((b) => b.branch).filter(Boolean))
      ) as string[],
    [builds]
  );

  const actors = useMemo(
    () =>
      Array.from(
        new Set(builds.map((b) => b.actor).filter(Boolean))
      ) as string[],
    [builds]
  );

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Releases</h3>

      {/* Filters */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by ID, commit, branch..."
              value={buildSearchText}
              onChange={(e) => setBuildSearchText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <select
              value={selectedBuildBranch ?? ''}
              onChange={(e) =>
                setSelectedBuildBranch(e.target.value || null)
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Actor</label>
            <select
              value={selectedBuildActor ?? ''}
              onChange={(e) =>
                setSelectedBuildActor(e.target.value || null)
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">All actors</option>
              {actors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Showing {filteredBuilds.length} of {builds.length} releases
        </div>
      </div>

      {/* Table */}
      <ReleasesTable
        filteredBuilds={ filteredBuilds}
        setDataModal={setDataModal}
      />
        
    </div>
  );
}
