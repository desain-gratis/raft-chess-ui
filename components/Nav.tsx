"use client";

import Link from 'next/link';
import React from 'react';
import { useNamespace } from '../context/NamespaceContext';

export default function Nav() {
  const { namespace, setNamespace } = useNamespace();

  return (
    <header className="w-full py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="container flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          Deployd UI
        </Link>

        <div className="flex items-center gap-4">
          <nav className="hidden sm:block">
            <Link href="/host/list" className="mr-4 text-sm">
              Host
            </Link>
            <Link href="/service/list" className="mr-4 text-sm">
              Service
            </Link>
            <Link href="/repository/list" className="text-sm">
              Repository
            </Link>
          </nav>

          <div className="relative">
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value as any)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
            >
              <option value="*">*</option>
              <option value="deployd">deployd</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
