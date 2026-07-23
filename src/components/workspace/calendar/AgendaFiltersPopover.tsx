'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  confirmation: string;
  collaborator: string;
  members: Array<{ userId: string; name: string }>;
  onConfirmationChange: (value: string) => void;
  onCollaboratorChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

type Position = { left: number; top: number; placement: 'below' | 'above' };

export default function AgendaFiltersPopover({ open, triggerRef, confirmation, collaborator, members, onConfirmationChange, onCollaboratorChange, onApply, onReset, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstControlRef = useRef<HTMLSelectElement>(null);
  const [mobile, setMobile] = useState(false);
  const [position, setPosition] = useState<Position>({ left: 16, top: 16, placement: 'below' });

  useEffect(() => {
    const updatePosition = () => {
      const isMobile = window.innerWidth < 640;
      setMobile(isMobile);
      if (isMobile || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = Math.min(360, window.innerWidth - 32);
      const panelHeight = 330;
      const below = rect.bottom + 8;
      const canOpenBelow = below + panelHeight <= window.innerHeight - 16;
      setPosition({
        left: Math.max(16, Math.min(rect.left, window.innerWidth - panelWidth - 16)),
        top: canOpenBelow ? below : Math.max(16, rect.top - panelHeight - 8),
        placement: canOpenBelow ? 'below' : 'above',
      });
    };

    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const frame = window.requestAnimationFrame(() => firstControlRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
      triggerRef.current?.focus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open, triggerRef]);

  if (!open || typeof document === 'undefined') return null;

  const closeAndRestoreFocus = () => {
    onClose();
    triggerRef.current?.focus();
  };
  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button, select, [href], input:not([disabled])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const panel = <div ref={panelRef} role="dialog" aria-modal={mobile || undefined} aria-labelledby="agenda-filters-title" onKeyDown={onPanelKeyDown} className={mobile ? 'fixed inset-x-3 bottom-3 top-3 z-[81] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.24)]' : 'fixed z-[81] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.24)]'} style={mobile ? undefined : { left: position.left, top: position.top }}>
    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Explorer le planning</p><h2 id="agenda-filters-title" className="mt-1 text-base font-bold text-slate-950">Filtres</h2></div><button type="button" onClick={closeAndRestoreFocus} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Fermer</button></div>
    <label htmlFor="agenda-filter-status" className="mt-5 block text-xs font-semibold text-slate-700">Statut<select ref={firstControlRef} id="agenda-filter-status" value={confirmation} onChange={(event) => onConfirmationChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="all">Tous les statuts</option><option value="pending">À confirmer</option><option value="confirmed">Confirmé</option><option value="change_requested">Changement demandé</option><option value="cancelled">Annulé / refusé</option></select></label>
    <label htmlFor="agenda-filter-collaborator" className="mt-4 block text-xs font-semibold text-slate-700">Collaborateur<select id="agenda-filter-collaborator" value={collaborator} onChange={(event) => onCollaboratorChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="all">Tous les collaborateurs</option><option value="me">Moi</option><option value="unassigned">Non affectés</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select></label>
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onReset} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Réinitialiser</button><button type="button" onClick={onApply} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2">Appliquer</button></div>
  </div>;

  return createPortal(<>{mobile ? <div className="fixed inset-0 z-[80] bg-slate-950/20" aria-hidden="true" /> : null}{panel}</>, document.body);
}
