import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

// Impressão / "Salvar como PDF": o conteúdo é montado em #print-root e só ele aparece no papel.
const usePrintStore = create<{ node: ReactNode | null }>(() => ({ node: null }));

export function imprimir(node: ReactNode) {
  usePrintStore.setState({ node });
}

export function PrintHost() {
  const node = usePrintStore((s) => s.node);
  const [el] = useState(() => document.getElementById('print-root'));
  useEffect(() => {
    if (!node) return;
    const done = () => usePrintStore.setState({ node: null });
    window.addEventListener('afterprint', done, { once: true });
    // tempo para as imagens carregarem antes de abrir a janela de impressão
    const t = setTimeout(() => window.print(), 900);
    return () => clearTimeout(t);
  }, [node]);
  if (!node || !el) return null;
  return createPortal(node, el);
}
