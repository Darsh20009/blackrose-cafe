interface SarIconProps {
  className?: string;
  size?: number;
}

export function SarIcon({ className = "", size = 14 }: SarIconProps) {
  return (
    <span
      className={`inline-block align-middle select-none font-bold leading-none ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-label="ريال سعودي"
    >
      ر.س
    </span>
  );
}

export default SarIcon;
