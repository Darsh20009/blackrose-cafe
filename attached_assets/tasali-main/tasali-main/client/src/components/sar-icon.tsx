interface SarIconProps {
  className?: string;
  size?: number;
}

export function SarIcon({ className = "", size = 14 }: SarIconProps) {
  return (
    <span
      aria-label="ريال سعودي"
      className={`sar-icon inline-block align-middle select-none shrink-0 font-bold leading-none ${className}`}
      style={{ fontSize: size * 0.85 }}
    >
      ر.س
    </span>
  );
}

export default SarIcon;
