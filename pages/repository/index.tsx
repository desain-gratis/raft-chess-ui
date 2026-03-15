"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import FlexSearch from 'flexsearch';
import { useNamespace } from '../../context/NamespaceContext';
import Modal from '../../components/Modal';
import ReleasesTable from '../../components/ServiceTabs/ReleasesTable';

type Repository = {
  id: string;
  namespace: string;
  name?: string;
  source?: string;
  published_at?: string;
  url?: string;
};

type Archive = {
  id?: string;
  url?: string;
};

type Build = {
  namespace?: string;
  id?: string;
  name?: string;
  commit_id?: string;
  branch?: string;
  actor?: string;
  tag?: string;
  data?: any;
  published_at?: string;
  repository_id?: string;
  url?: string;
  os_arch?: string[];
  archive?: Archive[];
};

export default function RepositoryDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { namespace } = useNamespace();

  const [repo, setRepo] = useState<Repository | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [filteredBuilds, setFilteredBuilds] = useState<Build[]>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataModal, setDataModal] = useState<any | null>(null);

  const [searchText, setSearchText] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [index, setIndex] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const fetchRepo = async () => {
      setLoadingRepo(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/artifactd/repository`, { headers: { 'X-Namespace': namespace } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const found = Array.isArray(data.success) ? data.success.find((r: any) => r.id === id) : null;
        setRepo(found ?? null);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch repository');
      } finally {
        if (mounted) setLoadingRepo(false);
      }
    };

    const fetchBuilds = async () => {
      setLoadingBuilds(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/artifactd/build`, { headers: { 'X-Namespace': namespace } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const list = Array.isArray(data.success) ? data.success.filter((b: any) => b.repository_id === id) : [];
        setBuilds(list);

        // Create flexsearch index
        const searchIndex = new FlexSearch.Index({ tokenize: 'forward' });
        list.forEach((b: Build) => {
          const combinedText = [
            b.id,
            b.commit_id,
            b.branch,
            b.actor,
            b.tag,
            b.name
          ].filter(Boolean).join(' ');
          searchIndex.add(b.id ?? '', combinedText);
        });
        if (mounted) setIndex(searchIndex);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch builds');
      } finally {
        if (mounted) setLoadingBuilds(false);
      }
    };

    fetchRepo();
    fetchBuilds();

    return () => {
      mounted = false;
    };
  }, [id, namespace]);

  useEffect(() => {
    let result = builds;

    // Apply search
    if (searchText && index) {
      const searchResults = index.search(searchText) as string[];
      const buildIds = new Set(searchResults);
      result = result.filter((b) => buildIds.has(b.id ?? ''));
    }

    // Apply branch filter
    if (selectedBranch) {
      result = result.filter((b) => b.branch === selectedBranch);
    }

    // Apply actor filter
    if (selectedActor) {
      result = result.filter((b) => b.actor === selectedActor);
    }

    setFilteredBuilds(result);
  }, [searchText, selectedBranch, selectedActor, builds, index]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Repository: {id}</h2>
          <div className="text-sm text-gray-600 dark:text-gray-300">Namespace: {namespace}</div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/repository/list" className="text-sm text-blue-600 dark:text-blue-400">
            ← Back to repositories
          </Link>
        </div>
      </div>

      {loadingRepo && <div className="text-sm">Loading repository...</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      {repo ? (
        <div className="mb-6">
          <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
            <div className="text-lg font-semibold">{repo.name ?? repo.id}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Source: {repo.source}</div>
            <div className="text-sm text-gray-500 mt-2">Published: {repo.published_at}</div>
          </div>
        </div>
      ) : (
        !loadingRepo && <div className="text-sm text-gray-600">Repository not found.</div>
      )}

      <h3 className="text-lg font-medium mb-4">Builds</h3>
      {loadingBuilds && <div className="text-sm">Loading builds...</div>}

      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by ID, commit, branch..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <select
              value={selectedBranch ?? ''}
              onChange={(e) => setSelectedBranch(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">All branches</option>
              {Array.from(new Set(builds.map((b) => b.branch))).map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Actor</label>
            <select
              value={selectedActor ?? ''}
              onChange={(e) => setSelectedActor(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">All actors</option>
              {Array.from(new Set(builds.map((b) => b.actor))).map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Showing {filteredBuilds.length} of {builds.length} builds
        </div>
      </div>

      {/* Table */}
      <ReleasesTable
        filteredBuilds={ filteredBuilds}
        setDataModal={setDataModal}
      />
        
      {dataModal && (
        <Modal title="Build Data" onClose={() => setDataModal(null)}>
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded text-[11px] overflow-auto">{JSON.stringify(dataModal, null, 2)}</pre>
        </Modal>
      )}
    </div>
  );
}
