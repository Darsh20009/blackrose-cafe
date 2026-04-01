import blackroseLogo from "@assets/blackrose-logo.png";

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
    ? phone.replace(/^(\+966|00966|0)/, "966")
    : "966XXXXXXXXX";

  const displaySar =
    sarValue !== undefined
      ? typeof sarValue === "number"
        ? sarValue.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : sarValue
      : (points * 0.02).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className={`relative rounded-2xl overflow-hidden select-none ${className}`}
      style={{
        background: "linear-gradient(145deg, #111111 0%, #1c1c1c 40%, #0e0e0e 100%)",
        aspectRatio: "1.586 / 1",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,169,110,0.15)",
      }}
      data-testid="loyalty-card"
    >
      {/* ─── subtle gold shimmer overlay ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 70% 15%, rgba(201,169,110,0.07) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(201,169,110,0.04) 0%, transparent 40%)",
        }}
      />

      {/* ─── NFC icon — top left ─── */}
      <div
        className="absolute"
        style={{ top: "9%", left: "6%", color: "#C9A96E" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
            fill="currentColor"
            opacity="0"
          />
          <path
            d="M6.5 12c0-3.04 2.46-5.5 5.5-5.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M5 12c0-3.87 3.13-7 7-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />
          <path
            d="M3.5 12C3.5 7.31 7.31 3.5 12 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="1"
          />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      </div>

      {/* ─── Logo — top right ─── */}
      <div
        className="absolute flex flex-col items-center"
        style={{ top: "7%", right: "6%" }}
      >
        <img
          src={blackroseLogo}
          alt="Black Rose"
          style={{
            width: "clamp(24px, 8%, 36px)",
            height: "clamp(24px, 8%, 36px)",
            objectFit: "contain",
            filter:
              "sepia(1) saturate(2.5) hue-rotate(5deg) brightness(1.15)",
          }}
        />
        <p
          className="font-black tracking-[0.18em] leading-none mt-1"
          style={{ color: "#C9A96E", fontSize: "clamp(7px, 1.8%, 11px)" }}
        >
          BLACK ROSE
        </p>
        <p
          className="tracking-[0.4em]"
          style={{ color: "#B89A5E", fontSize: "clamp(5px, 1.2%, 8px)" }}
        >
          CAFE
        </p>
      </div>

      {/* ─── Gold chip — left, below NFC ─── */}
      <div
        className="absolute"
        style={{ top: "27%", left: "6%" }}
      >
        <div
          style={{
            width: "clamp(28px, 9%, 44px)",
            height: "clamp(20px, 6.5%, 32px)",
            background:
              "linear-gradient(135deg, #e8c96a 0%, #c9a030 30%, #f0d878 50%, #b8860b 70%, #d4a820 100%)",
            borderRadius: "4px",
            position: "relative",
            boxShadow: "0 1px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)",
          }}
        >
          {/* chip grid lines */}
          <div
            style={{
              position: "absolute",
              inset: "20%",
              borderLeft: "1px solid rgba(0,0,0,0.25)",
              borderRight: "1px solid rgba(0,0,0,0.25)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "20%",
              borderTop: "1px solid rgba(0,0,0,0.25)",
              borderBottom: "1px solid rgba(0,0,0,0.25)",
            }}
          />
          {/* center rectangle */}
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: "25%",
              right: "25%",
              bottom: "30%",
              border: "1px solid rgba(0,0,0,0.2)",
              borderRadius: "1px",
              background: "rgba(180,130,0,0.3)",
            }}
          />
        </div>
      </div>

      {/* ─── Phone number — center ─── */}
      <div
        className="absolute"
        style={{
          top: "50%",
          left: "6%",
          right: "6%",
          transform: "translateY(-50%)",
        }}
      >
        <p
          className="font-mono font-bold tracking-[0.12em]"
          dir="ltr"
          style={{
            color: "#C9A96E",
            fontSize: "clamp(13px, 4.2%, 24px)",
            letterSpacing: "0.14em",
            textShadow: "0 0 20px rgba(201,169,110,0.3)",
          }}
          data-testid="text-phone-display"
        >
          {displayPhone}
        </p>
        {customerName && (
          <p
            className="mt-1 font-medium truncate"
            style={{
              color: "#C9A96E80",
              fontSize: "clamp(9px, 2.2%, 13px)",
            }}
          >
            {customerName}
          </p>
        )}
      </div>

      {/* ─── Floral decoration — bottom left ─── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-2%",
          left: "-1%",
          fontSize: "clamp(44px, 14%, 70px)",
          lineHeight: 1,
          opacity: 0.22,
          transform: "rotate(10deg)",
          filter: "hue-rotate(100deg) saturate(0.7) brightness(0.9)",
        }}
      >
        🌿
      </div>
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "4%",
          left: "6%",
          fontSize: "clamp(30px, 9%, 48px)",
          lineHeight: 1,
          opacity: 0.2,
          transform: "rotate(-5deg)",
          filter: "hue-rotate(100deg) saturate(0.6)",
        }}
      >
        🌸
      </div>

      {/* ─── Points — bottom right ─── */}
      <div
        className="absolute text-right"
        style={{ bottom: "8%", right: "6%" }}
      >
        <p
          style={{
            color: "#C9A96E",
            fontSize: "clamp(8px, 2%, 11px)",
            fontWeight: 700,
            letterSpacing: "0.05em",
            marginBottom: "1px",
          }}
        >
          نقاطي
        </p>
        <p
          className="font-black leading-none"
          style={{
            color: "#C9A96E",
            fontSize: "clamp(20px, 6%, 38px)",
            textShadow: "0 0 24px rgba(201,169,110,0.4)",
          }}
          data-testid="text-points"
        >
          {points.toLocaleString()}
        </p>
        <p
          style={{
            color: "#B89A5E",
            fontSize: "clamp(8px, 1.8%, 11px)",
            marginTop: "1px",
            letterSpacing: "0.05em",
          }}
          data-testid="text-sar-value"
        >
          {displaySar} ريال
        </p>
      </div>
    </div>
  );
}
