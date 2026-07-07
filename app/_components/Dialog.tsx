"use client";

import Icon from "./Icon";

export const inputClasses =
  "w-full rounded-[13px] border-[1.5px] border-line bg-panel px-[15px] py-[11px] text-[14.5px] font-semibold text-ink outline-none transition-[border-color,background,box-shadow] placeholder:text-faint focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_rgba(220,43,84,0.12)]";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13.5px] font-extrabold text-ink-soft">
      {children}
    </span>
  );
}

// Dialog shell: a bottom drawer on mobile, a centered modal on md+.
export default function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      <div className="relative flex max-h-[90dvh] w-full animate-[sheet-in_0.25s_ease-out] flex-col gap-[18px] overflow-y-auto rounded-t-[28px] border-t-[1.5px] border-line-soft bg-card p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-[0_-20px_60px_-20px_rgba(43,30,44,0.45)] md:max-w-md md:animate-[pop-in_0.18s_ease-out] md:rounded-[28px] md:border-[1.5px] md:p-7 md:shadow-[0_40px_90px_-40px_rgba(43,30,44,0.55)]">
        <div className="flex items-center justify-between">
          <h2 className="m-0 font-display text-[22px] font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-soft transition-colors hover:bg-chip hover:text-ink-soft"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
