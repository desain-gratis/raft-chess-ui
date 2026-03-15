"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useNamespace } from '../../context/NamespaceContext';

type Repository = {
  url?: string;
  namespace?: string;
  id?: string;
};

type BoundAddress = {
  host?: string;
  port?: number;
};

type Service = {
  namespace: string;
  id: string;
  name?: string;
  description?: string;
  repository?: Repository;
  executable_path?: string;
  bound_addresses?: BoundAddress[];
  published_at?: string;
  url?: string;
};

export default function ServicePage() {
  const { namespace } = useNamespace();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/deployd/service`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setServices(Array.isArray(data.success) ? data.success : []);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load services');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchServices();
    return () => {
      mounted = false;
    };
  }, [namespace]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Services</h2>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400">
          ← Back
        </Link>
      </div>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">Using namespace: {namespace}</div>

      {loading && <div className="text-sm">Loading services...</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <Link key={`${s.namespace}_${s.id}`} href={`/service/?id=${encodeURIComponent(s.id)}`} className="card block">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{s.name ?? s.id}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{s.description}</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.published_at ? new Date(s.published_at).toLocaleString() : ''}</div>
            </div>

            <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{s.repository?.namespace}/{s.repository?.id}</div>
            {s.bound_addresses && s.bound_addresses.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {s.bound_addresses.map((b, i) => (
                  <div key={i}>{b.host}:{b.port}</div>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
