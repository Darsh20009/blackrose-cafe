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
  const displayPhone = phone
    ? phone.replace(/^\+?966|^00966/, "966").replace(/^0(\d{9})$/, "966$1")
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
        borderRadius: 22,
        background: "linear-gradient(145deg, #1a0a10 0%, #0d0d0d 45%, #120e04 100%)",
        boxShadow:
          "0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(200,165,58,0.14), inset 0 1px 0 rgba(200,165,58,0.08)",
      }}
      data-testid="loyalty-card"
    >
      {/* Red glow — top right */}
      <div
        style={{
          position: "absolute",
          top: "-30%",
          right: "-15%",
          width: "55%",
          height: "130%",
          background:
            "radial-gradient(ellipse at center, rgba(190,24,69,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Gold shimmer band */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, transparent 30%, rgba(200,165,58,0.05) 50%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle grid lines */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.04,
          pointerEvents: "none",
        }}
        viewBox="0 0 856 540"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="180" x2="856" y2="180" stroke="#C8A53A" strokeWidth="1" />
        <line x1="0" y1="360" x2="856" y2="360" stroke="#C8A53A" strokeWidth="1" />
        <line x1="285" y1="0" x2="285" y2="540" stroke="#C8A53A" strokeWidth="1" />
        <line x1="570" y1="0" x2="570" y2="540" stroke="#C8A53A" strokeWidth="1" />
        <circle cx="428" cy="270" r="180" fill="none" stroke="#C8A53A" strokeWidth="0.8" />
      </svg>

      {/* Top left: Brand name */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "7%",
        }}
      >
        <p
          style={{
            color: "#C8A53A",
            fontSize: "clamp(9px, 2.3vw, 14px)",
            fontWeight: 800,
            letterSpacing: "0.3em",
            margin: 0,
            textShadow: "0 1px 10px rgba(200,165,58,0.6)",
            lineHeight: 1,
          }}
        >
          BLACK ROSE
        </p>
        <p
          style={{
            color: "rgba(200,165,58,0.45)",
            fontSize: "clamp(5px, 1.2vw, 7px)",
            letterSpacing: "0.4em",
            margin: "3px 0 0",
            textTransform: "uppercase",
          }}
        >
          Loyalty Card
        </p>
      </div>

      {/* Top right: Rose emblem */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "7%",
          width: "clamp(26px, 6.5vw, 38px)",
          height: "clamp(26px, 6.5vw, 38px)",
          borderRadius: "50%",
          border: "1px solid rgba(190,24,69,0.55)",
          background: "rgba(190,24,69,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(11px, 2.8vw, 17px)",
        }}
      >
        🌹
      </div>

      {/* Middle left: Phone number + name */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "7%",
          transform: "translateY(-50%)",
        }}
      >
        <p
          dir="ltr"
          style={{
            color: "#C8A53A",
            fontWeight: 700,
            fontSize: "clamp(11px, 3vw, 18px)",
            letterSpacing: "0.1em",
            margin: 0,
            fontFamily: "'Courier New', 'Trebuchet MS', monospace",
            textShadow: "0 1px 8px rgba(200,165,58,0.45)",
          }}
          data-testid="text-phone-display"
        >
          {displayPhone}
        </p>
        {customerName && (
          <p
            style={{
              color: "rgba(255,255,255,0.32)",
              fontSize: "clamp(6px, 1.4vw, 9px)",
              margin: "4px 0 0",
              letterSpacing: "0.07em",
            }}
          >
            {customerName}
          </p>
        )}
      </div>

      {/* Middle right: Chip (decorative) */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          right: "7%",
          transform: "translateY(-50%)",
          width: "clamp(26px, 6vw, 38px)",
          height: "clamp(20px, 4.5vw, 28px)",
          borderRadius: 5,
          background:
            "linear-gradient(135deg, rgba(200,165,58,0.55) 0%, rgba(200,165,58,0.18) 100%)",
          border: "1px solid rgba(200,165,58,0.38)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      />

      {/* Bottom: Points + SAR */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "7%",
          right: "7%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              color: "rgba(200,165,58,0.5)",
              fontSize: "clamp(5px, 1.2vw, 7px)",
              letterSpacing: "0.35em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Points
          </p>
          <p
            style={{
              color: "#C8A53A",
              fontWeight: 900,
              fontSize: "clamp(20px, 5.2vw, 32px)",
              margin: 0,
              lineHeight: 1,
              textShadow: "0 2px 14px rgba(200,165,58,0.55)",
            }}
            data-testid="text-points"
          >
            {points.toLocaleString()}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p
            style={{
              color: "rgba(200,165,58,0.45)",
              fontSize: "clamp(5px, 1.2vw, 7px)",
              letterSpacing: "0.25em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Value
          </p>
          <p
            style={{
              color: "rgba(200,165,58,0.75)",
              fontSize: "clamp(9px, 2.2vw, 13px)",
              margin: 0,
              fontFamily: "monospace",
              letterSpacing: "0.04em",
            }}
            data-testid="text-sar-value"
          >
            {displaySar} ر.س
          </p>
        </div>
      </div>

      {/* Bottom gold line accent */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "7%",
          right: "7%",
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(200,165,58,0.4) 30%, rgba(200,165,58,0.4) 70%, transparent)",
        }}
      />
    </div>
  );
}
