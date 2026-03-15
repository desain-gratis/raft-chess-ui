"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useNamespace } from '../../context/NamespaceContext';

type Repository = {
  id: string;
  namespace: string;
  name?: string;
  source?: string;
  published_at?: string;
  url?: string;
};

export default function ArtifactPage() {
  const { namespace } = useNamespace();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchRepos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/artifactd/repository`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setRepos(Array.isArray(data.success) ? data.success : []);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load repositories');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRepos();
    return () => {
      mounted = false;
    };
  }, [namespace]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Repositories</h2>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400">
          ← Back
        </Link>
      </div>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">Using namespace: {namespace}</div>

      {loading && <div className="text-sm">Loading repositories...</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {repos.map((r) => (
          <Link key={`${r.namespace}_${r.id}`} href={`/repository?id=${encodeURIComponent(r.id)}`} className="card block">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{r.name ?? r.id}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{r.source}</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{r.published_at ? new Date(r.published_at).toLocaleString() : ''}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
