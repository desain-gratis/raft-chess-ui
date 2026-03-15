"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Namespace = '*' | 'deployd';

type NSContext = {
  namespace: Namespace;
  setNamespace: (n: Namespace) => void;
};

const NamespaceContext = createContext<NSContext | undefined>(undefined);

export const NamespaceProvider = ({ children }: { children: ReactNode }) => {
  const [namespace, setNamespace] = useState<Namespace>('*');
  return (
    <NamespaceContext.Provider value={{ namespace, setNamespace }}>
      {children}
    </NamespaceContext.Provider>
  );
};

export const useNamespace = () => {
  const ctx = useContext(NamespaceContext);
  if (!ctx) throw new Error('useNamespace must be used within NamespaceProvider');
  return ctx;
};

export default NamespaceContext;
