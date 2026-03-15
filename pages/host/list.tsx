"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useNamespace } from '../../context/NamespaceContext';
import Modal from '../../components/Modal';

type ClickhouseConfig = {
  address?: string;
};

type RaftConfig = {
  replica_id?: number;
  base_wal_dir?: string;
  base_node_host_dir?: string;
  rtt_millisecond?: number;
  clickhouse_state_store?: ClickhouseConfig;
};

type Host = {
  namespace: string;
  host: string;
  architecture?: string;
  os?: string;
  fqdn?: string;
  raft_config?: RaftConfig;
  published_at?: string;
  url?: string;
};

export default function HostPage() {
  const { namespace } = useNamespace();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Host | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchHosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/deployd/host`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setHosts(Array.isArray(data.success) ? data.success : []);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load hosts');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchHosts();
    return () => {
      mounted = false;
    };
  }, [namespace]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Hosts</h2>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400">
          ← Back
        </Link>
      </div>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">Using namespace: {namespace}</div>

      {loading && <div className="text-sm">Loading hosts...</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hosts.map((h) => (
          <div key={h.host} onClick={() => setSelected(h)} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{h.host}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{h.os} • {h.architecture}</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{h.published_at ? new Date(h.published_at).toLocaleString() : ''}</div>
            </div>
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{h.fqdn}</div>
          </div>
        ))}
      </div>

      {selected && (
        <Modal title={`Host: ${selected.host}`} onClose={() => setSelected(null)}>
          <div className="mb-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Namespace: {selected.namespace}</div>
            <div className="text-sm mb-2">Host: <strong>{selected.host}</strong></div>
            <div className="text-sm mb-2">OS / Arch: {selected.os} / {selected.architecture}</div>
            <div className="text-sm mb-2">FQDN: {selected.fqdn}</div>
            <div className="text-sm mb-2">Published: {selected.published_at}</div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Raft Config</h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded text-[11px] overflow-auto">{JSON.stringify(selected.raft_config, null, 2)}</pre>
          </div>
        </Modal>
      )}
    </div>
  );
}
