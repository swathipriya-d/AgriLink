import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, eyebrow, size = 'medium', children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    ref.current?.focus();
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-eyebrow" ref={ref} tabIndex={-1} role="dialog" className={`dialog dialog-${size}`}>
        <div className="dialog-heading">
          <div>{eyebrow && <p id="dialog-eyebrow" className="eyebrow">{eyebrow}</p>}<h2 id="dialog-title">{title}</h2></div>
          <button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
