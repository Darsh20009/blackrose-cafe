import { RIYAL_SYMBOL_URL } from "@/lib/riyal-symbol";

interface SarIconProps {
  className?: string;
  size?: number;
}

export function SarIcon({ className = "", size = 14 }: SarIconProps) {
  return (
    <img
      src={RIYAL_SYMBOL_URL}
      alt="رمز الريال السعودي"
      role="img"
      draggable={false}
      className={`inline-block align-middle select-none object-contain ${className}`}
      style={{
        width: size,
        height: size,
        marginInline: "0.12em",
        verticalAlign: "-0.15em",
      }}
    />
  );
}

export default SarIcon;
