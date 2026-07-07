// Material Symbols (outlined) icon. `name` is the symbol's ligature name,
// e.g. "close", "add", "calendar_month" — https://fonts.google.com/icons
export default function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined select-none leading-none ${className}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
