"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

/** Focus-trapped modal on the native <dialog> element: showModal() gives us
 * the trap, Esc handling, and ::backdrop for free; we restore focus on close. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
      (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // click on the backdrop (the dialog element itself) closes
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className="w-[min(480px,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-menu backdrop:bg-ink/40"
    >
      <div className="p-5">
        <h2 id="dialog-title" className="mb-3 font-display text-lg font-medium">
          {title}
        </h2>
        <div className="text-base">{children}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
        {footer ?? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </dialog>
  );
}
