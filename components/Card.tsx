import React from 'react';
import Link from 'next/link';

export default function Card({ href, title, description }: { href: string; title: string; description?: string }) {
  return (
    <Link href={href} className="card block">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description ? <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p> : null}
    </Link>
  );
}
