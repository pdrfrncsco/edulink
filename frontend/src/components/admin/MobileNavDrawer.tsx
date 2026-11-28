'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface MobileNavDrawerProps {
  id: string;
  open: boolean;
  ariaLabel: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Accessible mobile navigation drawer backed by a modal `<dialog>` with native
 * CSS scroll-snap swipe-to-dismiss, `100svh` sizing, and reduced-motion support.
 */
export default function MobileNavDrawer({
  id,
  open,
  ariaLabel,
  title,
  subtitle,
  onClose,
  children,
}: MobileNavDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const observeCloseRef = useRef(false);

  onCloseRef.current = onClose;
  const openPropRef = useRef(open);
  openPropRef.current = open;

  const requestAnimatedClose = () => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !dialog.open) return;

    if (!scroller || !sheet || scroller.offsetWidth <= 0 || sheet.offsetWidth <= 0) {
      dialog.close();
      return;
    }
    scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'auto' });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !scroller || !sheet) return;

    const visibleThreshold = Math.min(0.05, 1 / Math.max(window.innerWidth, 320));

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry || !dialog.open || !observeCloseRef.current) return;
        if (entry.intersectionRatio < visibleThreshold) {
          observeCloseRef.current = false;
          dialog.close();
        }
      },
      { root: dialog, threshold: [visibleThreshold, 1] }
    );
    observer.observe(sheet);

    const onDialogClick = (event: MouseEvent) => {
      if (!sheet.contains(event.target as Node)) {
        requestAnimatedClose();
      }
    };

    const onDialogCancel = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
        requestAnimatedClose();
      }
    };

    const onDialogClose = () => {
      observeCloseRef.current = false;
      if (openPropRef.current) {
        onCloseRef.current();
      }
    };

    dialog.addEventListener('click', onDialogClick);
    dialog.addEventListener('cancel', onDialogCancel);
    dialog.addEventListener('close', onDialogClose);

    let cleanupScrollFade: (() => void) | undefined;
    if (!CSS.supports('animation-timeline: scroll()')) {
      const onScroll = () => {
        const width = sheet.offsetWidth || 1;
        const ratio = Math.max(0, Math.min(1, 1 - scroller.scrollLeft / width));
        dialog.style.setProperty('--drawer-backdrop', ratio.toFixed(3));
      };
      scroller.addEventListener('scroll', onScroll, { passive: true });
      cleanupScrollFade = () => scroller.removeEventListener('scroll', onScroll);
    }

    return () => {
      observer.disconnect();
      dialog.removeEventListener('click', onDialogClick);
      dialog.removeEventListener('cancel', onDialogCancel);
      dialog.removeEventListener('close', onDialogClose);
      cleanupScrollFade?.();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    if (!dialog || !scroller) return;

    let cancelled = false;

    const openDrawer = async () => {
      observeCloseRef.current = false;
      if (!dialog.open) {
        dialog.showModal();
      }

      if (!CSS.supports('scroll-initial-target', 'nearest')) {
        scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'instant' });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
      }

      if (!cancelled && dialog.open) {
        scroller.scrollTo({ left: 0, behavior: 'auto' });
        closeButtonRef.current?.focus({ preventScroll: true });
        requestAnimationFrame(() => {
          if (!cancelled && dialog.open) {
            observeCloseRef.current = true;
          }
        });
      }
    };

    if (open) {
      openDrawer();
    } else if (dialog.open) {
      requestAnimatedClose();
    }

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-label={ariaLabel}
      className="edulink-drawer lg:hidden"
    >
      <div ref={scrollerRef} className="edulink-drawer-scroller">
        <nav
          ref={sheetRef}
          aria-label="Secções do painel"
          className="edulink-drawer-sheet bg-white text-stone-900 border-r border-stone-200 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-stone-200 bg-stone-50/70">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 truncate">
                {title}
              </p>
              {subtitle && <p className="text-xs text-stone-600 truncate">{subtitle}</p>}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={requestAnimatedClose}
              aria-label="Fechar menu"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 transition shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="p-4 space-y-4">{children}</div>
        </nav>
      </div>
    </dialog>
  );
}
