import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, size = 'md', children }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose?.();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without native <dialog closedby="any"> support (e.g. Safari)
    let cleanupFallback = () => {};
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onDown = (e) => {
        pressedOutside = isOutside(e);
      };
      const onUp = (e) => {
        if (pressedOutside && isOutside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`erp-dialog ${size === 'lg' ? 'erp-dialog-lg' : ''}`}
      {...{ closedby: 'any' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <h2 id={titleId} className="text-base font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 overflow-y-auto flex-1">{open ? children : null}</div>
    </dialog>
  );
}
