import cardBg from "@assets/Screenshot_2026-04-01_133140_1775039553998.png";

interface BlackRoseCardProps {
  phone?: string;
  points?: number;
  sarValue?: number | string;
  customerName?: string;
  className?: string;
}

export default function BlackRoseCard({
  phone,
  points = 0,
  sarValue,
  customerName,
  className = "",
}: BlackRoseCardProps) {
  /* normalise phone → 966XXXXXXXXX */
  const displayPhone = phone
    ? phone
        .replace(/^\+?966|^00966/, "966")
        .replace(/^0(\d{9})$/, "966$1")
    : "966XXXXXXXXX";

  const sarNum =
    typeof sarValue === "number"
      ? sarValue
      : typeof sarValue === "string"
      ? parseFloat(sarValue) || 0
      : points * 0.02;

  const displaySar = sarNum.toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      style={{
        width: "100%",
        aspectRatio: "85.6 / 53.98",
        borderRadius: 16,
        background: "#111111",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
      data-testid="loyalty-card"
    >
      {/* ── Card background image ── */}
      <img
        src={cardBg}
        alt="Black Rose Cafe loyalty card"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          pointerEvents: "none",
        }}
      />

      {/* ── Phone number ── */}
      <div
        style={{
          position: "absolute",
          top: "52%",
          left: "7%",
          transform: "translateY(-50%)",
        }}
      >
        <p
          dir="ltr"
          style={{
            color: "#C8A53A",
            fontWeight: 700,
            fontSize: "clamp(11px, 3.2vw, 20px)",
            letterSpacing: "0.12em",
            margin: 0,
            fontFamily: "'Trebuchet MS', Arial, sans-serif",
            textShadow: "0 1px 6px rgba(0,0,0,0.8)",
          }}
          data-testid="text-phone-display"
        >
          {displayPhone}
        </p>
        {customerName && (
          <p
            style={{
              color: "rgba(200,165,58,0.65)",
              fontSize: "clamp(7px, 1.6vw, 10px)",
              margin: "3px 0 0",
              letterSpacing: "0.05em",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            {customerName}
          </p>
        )}
      </div>

      {/* ── Points + SAR — bottom-right ── */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "7%",
          textAlign: "right",
        }}
      >
        <p
          style={{
            color: "#C8A53A",
            fontSize: "clamp(7px, 1.6vw, 10px)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            margin: 0,
            textShadow: "0 1px 4px rgba(0,0,0,0.7)",
          }}
        >
          نقاطي
        </p>
        <p
          style={{
            color: "#C8A53A",
            fontWeight: 900,
            fontSize: "clamp(18px, 5vw, 30px)",
            lineHeight: 1.05,
            margin: 0,
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          }}
          data-testid="text-points"
        >
          {points.toLocaleString()}
        </p>
        <p
          style={{
            color: "#A8872A",
            fontSize: "clamp(7px, 1.6vw, 10px)",
            margin: "2px 0 0",
            letterSpacing: "0.05em",
            textShadow: "0 1px 4px rgba(0,0,0,0.7)",
          }}
          data-testid="text-sar-value"
        >
          {displaySar} ريال
        </p>
      </div>
    </div>
  );
}
