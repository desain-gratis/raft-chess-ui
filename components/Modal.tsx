"use client";

import React from 'react';

export default function Modal({ title, children, onClose }: { title?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm text-gray-600 dark:text-gray-300">Close</button>
        </div>
        <div className="overflow-auto max-h-[60vh]">{children}</div>
      </div>
    </div>
  );
}
