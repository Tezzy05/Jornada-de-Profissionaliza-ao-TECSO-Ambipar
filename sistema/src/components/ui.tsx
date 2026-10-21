import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { create } from 'zustand';
import { X, Play, FileText, Check } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn, initials, toneFor, uid } from '@/lib/utils';
import { useMediaURL } from '@/lib/media';
import type { Usuario } from '@/lib/types';

// ---------------- toast ----------------
interface ToastItem { id: string; t: string; err?: boolean; action?: { label: string; fn: () => void } }
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
export function toast(t: string, err?: boolean, action?: ToastItem['action']) {
  const id = uid();
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, t, err, action }] }));
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== id) })), action ? 6000 : 3200);
}
export function Toasts() {
  const items = useToasts((s) => s.items);
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((i) => (
          <motion.div key={i.id} className={cn('toast', i.err && 'err')} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <span>{i.t}</span>
            {i.action && (
              <button
                onClick={() => {
                  i.action!.fn();
                  useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== i.id) }));
                }}
              >
                {i.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------- modal e gaveta ----------------
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className={cn('modal-box', wide && 'wide')} aria-describedby={undefined}>
          <div className="mh">
            <Dialog.Title asChild>
              <h3>{title}</h3>
            </Dialog.Title>
            <Dialog.Close className="icon-btn x" aria-label="Fechar">
              <X />
            </Dialog.Close>
          </div>
          <div className="mb">{children}</div>
          {footer && <div className="mf">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Drawer({ open, onClose, title, sub, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="drawer" aria-describedby={undefined}>
          <div className="mh">
            <div className="min-w-0">
              <Dialog.Title asChild>
                <h3>{title}</h3>
              </Dialog.Title>
              {sub && <div className="text-[12.5px] text-[#b9cbbd] mt-1">{sub}</div>}
            </div>
            <Dialog.Close className="icon-btn x" aria-label="Fechar">
              <X />
            </Dialog.Close>
          </div>
          <div className="mb">{children}</div>
          {footer && <div className="mf">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------- confirmação ----------------
interface ConfirmReq { title: string; text: ReactNode; ok: string; danger?: boolean; resolve: (v: boolean) => void }
const useConfirmStore = create<{ req: ConfirmReq | null }>(() => ({ req: null }));
export function confirmar(title: string, text: ReactNode, ok = 'Confirmar', danger = false) {
  return new Promise<boolean>((resolve) => useConfirmStore.setState({ req: { title, text, ok, danger, resolve } }));
}
export function ConfirmHost() {
  const req = useConfirmStore((s) => s.req);
  const close = (v: boolean) => {
    req?.resolve(v);
    useConfirmStore.setState({ req: null });
  };
  return (
    <Modal
      open={!!req}
      onClose={() => close(false)}
      title={req?.title}
      footer={
        <>
          <button className="btn ghost" onClick={() => close(false)}>Cancelar</button>
          <button className={cn('btn', req?.danger ? 'danger' : 'pri')} onClick={() => close(true)}>{req?.ok}</button>
        </>
      }
    >
      <div className="text-[14px]">{req?.text}</div>
    </Modal>
  );
}

// ---------------- pequenos componentes ----------------
export function Avatar({ u, size }: { u?: Pick<Usuario, 'id' | 'nome'> | null; size?: 'sm' | 'xs' }) {
  if (!u) return <span className={cn('avatar', size)}>?</span>;
  return (
    <span className={cn('avatar', size)} style={{ background: toneFor(u.id) }} title={u.nome}>
      {initials(u.nome)}
    </span>
  );
}

export function Bar({ v, thick }: { v: number; thick?: boolean }) {
  return (
    <div className={cn('bar', thick && 'thick')} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
    </div>
  );
}

export function Empty({ icon, title, text, children }: { icon?: ReactNode; title: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <div className="text-center py-12 px-5 muted">
      {icon && <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-[#eef2e9] grid place-items-center text-[var(--leaf-d)] [&>svg]:w-6 [&>svg]:h-6">{icon}</div>}
      <h3 className="text-[15px] font-bold text-[var(--text)] mb-1">{title}</h3>
      {text && <p className="text-[13px] max-w-md mx-auto">{text}</p>}
      {children && <div className="mt-4 flex justify-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export function PageHead({ crumbs, title, sub, children }: { crumbs?: ReactNode; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="min-w-0">
        {crumbs && <div className="crumbs">{crumbs}</div>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="flex gap-2.5 flex-wrap items-center">{children}</div>}
    </div>
  );
}

export function Field({ label, req, opt, children, className, hint }: { label: ReactNode; req?: boolean; opt?: boolean; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <div className={cn('fl', className)}>
      <label>
        {label}
        {req && <span className="req">Obrig.</span>}
        {opt && <span className="opt">Opcional</span>}
      </label>
      {children}
      {hint && <div className="text-[11.5px] muted mt-1">{hint}</div>}
    </div>
  );
}

export function CheckBox({ on, onClick, disabled, label }: { on: boolean; onClick?: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" className={cn('cb', on && 'y')} onClick={onClick} disabled={disabled} aria-pressed={on} aria-label={label}>
      {on && <Check strokeWidth={3.2} />}
    </button>
  );
}

/** Miniatura de uma mídia guardada (foto, vídeo, PDF). */
export function MediaThumb({ id, kind, className, label, onClick }: { id?: string | null; kind?: 'img' | 'vid' | 'doc'; className?: string; label?: string; onClick?: () => void }) {
  const url = useMediaURL(id);
  const isVidSeed = id?.startsWith('seed:vid:');
  const content =
    !id ? null : kind === 'doc' ? (
      <div className="absolute inset-0 grid place-items-center bg-[#eef2e9] text-[var(--leaf-d)]"><FileText /></div>
    ) : kind === 'vid' && !isVidSeed ? (
      url && <video src={url} muted playsInline />
    ) : (
      url && <img src={url} alt={label ?? ''} />
    );
  return (
    <div className={cn('relative overflow-hidden bg-[#dfe6dc]', className)} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      {content}
      {kind === 'vid' && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="w-8 h-8 rounded-full bg-[rgba(6,38,15,.75)] grid place-items-center text-[var(--lime)]"><Play className="w-4 h-4" fill="currentColor" /></span>
        </span>
      )}
    </div>
  );
}

/** Abre o seletor de arquivo (câmera no celular) e devolve o File. */
export function pickFile(accept: string, capture = true): Promise<File | null> {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    if (capture) inp.setAttribute('capture', 'environment');
    inp.onchange = () => resolve(inp.files?.[0] ?? null);
    inp.click();
  });
}

// ---------------- assinatura ----------------
export function SignaturePad({ value, onChange, height = 130, disabled }: { value?: string; onChange: (dataUrl: string | null) => void; height?: number; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);
  const existing = useMediaURL(value);
  const drawing = useRef(false);

  const size = () => {
    const cv = ref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    cv.width = r.width * devicePixelRatio;
    cv.height = r.height * devicePixelRatio;
    const cx = cv.getContext('2d')!;
    cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    cx.lineWidth = 2.2;
    cx.lineCap = 'round';
    cx.strokeStyle = '#0d1f3a';
  };
  useEffect(() => {
    size();
  }, []);

  if (value && existing && !drawn) {
    return (
      <div>
        <div className="sig ok grid place-items-center" style={{ height }}>
          <img src={existing} alt="Assinatura registrada" style={{ maxHeight: height - 20 }} />
        </div>
        {!disabled && (
          <button type="button" className="muted text-[12px] mt-1" onClick={() => { onChange(null); setTimeout(size, 30); }}>
            Refazer assinatura
          </button>
        )}
      </div>
    );
  }

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  return (
    <div>
      <canvas
        ref={ref}
        className={cn('sig', drawn && 'ok')}
        style={{ height, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : undefined }}
        onPointerDown={(e) => {
          const cx = ref.current!.getContext('2d')!;
          if (ref.current!.width === 300) size();
          drawing.current = true;
          cx.beginPath();
          cx.moveTo(...pos(e));
          (e.target as Element).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const cx = ref.current!.getContext('2d')!;
          cx.lineTo(...pos(e));
          cx.stroke();
          if (!drawn) setDrawn(true);
        }}
        onPointerUp={() => {
          if (drawing.current && drawn) onChange(ref.current!.toDataURL('image/png'));
          drawing.current = false;
        }}
      />
      {!disabled && (
        <button type="button" className="muted text-[12px] mt-1" onClick={() => { size(); setDrawn(false); onChange(null); }}>
          Limpar
        </button>
      )}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([k, l]) => (
        <button key={k} className={cn(value === k && 'on')} onClick={() => onChange(k)} role="tab" aria-selected={value === k}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Kpi({ label, value, children, tone }: { label: string; value: ReactNode; children?: ReactNode; tone?: string }) {
  return (
    <div className="card kpi">
      <span>{label}</span>
      <b style={tone ? { color: tone } : undefined}>{value}</b>
      {children}
    </div>
  );
}
