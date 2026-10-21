import { MARK, WORD } from './paths';

/** Escrita "ambipar" vetorizada do logo enviado. A cor vem de currentColor. */
export function AmbiparWord({ className, title = 'Ambipar' }: { className?: string; title?: string }) {
  return (
    <svg viewBox={WORD.viewBox} className={className} role="img" aria-label={title} fill="currentColor">
      <path d={WORD.d} fillRule="evenodd" />
    </svg>
  );
}

/** Símbolo do "a" no losango. */
export function AmbiparMark({ className, title = 'Ambipar' }: { className?: string; title?: string }) {
  return (
    <svg viewBox={MARK.viewBox} className={className} role="img" aria-label={title} fill="currentColor">
      <path d={MARK.d} fillRule="evenodd" />
    </svg>
  );
}

/** Ícone do app: símbolo verde-escuro sobre quadrado lima (como o ícone oficial). */
export function AmbiparIcon({ size = 34, radius = 9 }: { size?: number; radius?: number }) {
  return (
    <span className="grid place-items-center flex-none" style={{ width: size, height: size, borderRadius: radius, background: 'var(--lime)', color: 'var(--brand-dark)' }}>
      <AmbiparMark className="w-[66%] h-[66%]" />
    </span>
  );
}
