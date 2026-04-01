import blackroseLogo from "@assets/blackrose-logo.png";

interface BlackRoseCardProps {
  phone?: string;
  points?: number;
  sarValue?: number | string;
  customerName?: string;
  className?: string;
}

/* ── Floral SVG decoration (bottom-left, mimics botanical illustration) ── */
function FloralDecoration() {
  return (
    <svg
      viewBox="0 0 160 130"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", bottom: 0, left: 0, width: "38%", opacity: 0.45, pointerEvents: "none" }}
    >
      {/* Stem */}
      <path d="M30 130 Q45 95 55 70 Q65 45 60 20" stroke="#4a7c59" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M55 70 Q70 55 85 60" stroke="#4a7c59" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M45 95 Q30 80 20 85" stroke="#4a7c59" strokeWidth="2" fill="none" strokeLinecap="round"/>

      {/* Leaves */}
      <ellipse cx="80" cy="65" rx="18" ry="9" fill="#3d6b48" transform="rotate(-30 80 65)"/>
      <ellipse cx="22" cy="82" rx="15" ry="7" fill="#4a7c59" transform="rotate(20 22 82)"/>
      <ellipse cx="65" cy="45" rx="12" ry="6" fill="#5a8c69" transform="rotate(-50 65 45)"/>

      {/* Big flower (white/pale blue petals) */}
      <g transform="translate(55 22)">
        {[0,45,90,135,180,225,270,315].map((angle, i) => (
          <ellipse
            key={i}
            cx={Math.cos((angle * Math.PI) / 180) * 13}
            cy={Math.sin((angle * Math.PI) / 180) * 13}
            rx="7"
            ry="4"
            fill="#cce8dc"
            transform={`rotate(${angle} ${Math.cos((angle * Math.PI) / 180) * 13} ${Math.sin((angle * Math.PI) / 180) * 13})`}
          />
        ))}
        <circle cx="0" cy="0" r="6" fill="#f0e68c" opacity="0.9"/>
        <circle cx="0" cy="0" r="3" fill="#c8a020"/>
      </g>

      {/* Small flower */}
      <g transform="translate(25 88)">
        {[0,60,120,180,240,300].map((angle, i) => (
          <ellipse
            key={i}
            cx={Math.cos((angle * Math.PI) / 180) * 9}
            cy={Math.sin((angle * Math.PI) / 180) * 9}
            rx="5"
            ry="3"
            fill="#b8ddd0"
            transform={`rotate(${angle} ${Math.cos((angle * Math.PI) / 180) * 9} ${Math.sin((angle * Math.PI) / 180) * 9})`}
          />
        ))}
        <circle cx="0" cy="0" r="4" fill="#e8d870" opacity="0.85"/>
        <circle cx="0" cy="0" r="2" fill="#b8900a"/>
      </g>

      {/* Berries / dots */}
      <circle cx="70" cy="18" r="3" fill="#c9a96e" opacity="0.7"/>
      <circle cx="75" cy="12" r="2" fill="#c9a96e" opacity="0.5"/>
      <circle cx="63" cy="13" r="2.5" fill="#c9a96e" opacity="0.6"/>
    </svg>
  );
}

/* ── NFC / Contactless symbol ── */
function NfcIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2" fill="#C9A96E"/>
      <path d="M8.5 8.5 A5 5 0 0 0 8.5 15.5" stroke="#C9A96E" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M6 6 A8.5 8.5 0 0 0 6 18" stroke="#C9A96E" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.75"/>
      <path d="M3.5 3.5 A12 12 0 0 0 3.5 20.5" stroke="#C9A96E" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  );
}

/* ── Credit Card Chip ── */
function CardChip({ width = 44 }: { width?: number }) {
  const h = width * 0.72;
  return (
    <div style={{ width, height: h, borderRadius: 4, overflow: "hidden", position: "relative",
      background: "linear-gradient(135deg, #e8c86a 0%, #c9a030 30%, #f0d46a 55%, #b08010 80%, #d4a520 100%)",
      boxShadow: "0 2px 6px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
      {/* horizontal lines */}
      <div style={{ position:"absolute", left:"20%", right:"20%", top:"28%", height:1, background:"rgba(0,0,0,0.2)" }}/>
      <div style={{ position:"absolute", left:"20%", right:"20%", bottom:"28%", height:1, background:"rgba(0,0,0,0.2)" }}/>
      {/* vertical lines */}
      <div style={{ position:"absolute", top:"20%", bottom:"20%", left:"28%", width:1, background:"rgba(0,0,0,0.18)" }}/>
      <div style={{ position:"absolute", top:"20%", bottom:"20%", right:"28%", width:1, background:"rgba(0,0,0,0.18)" }}/>
      {/* center pad */}
      <div style={{ position:"absolute", top:"28%", bottom:"28%", left:"28%", right:"28%",
        background:"rgba(180,130,0,0.35)", border:"1px solid rgba(0,0,0,0.15)", borderRadius:2 }}/>
    </div>
  );
}

export default function BlackRoseCard({
  phone,
  points = 0,
  sarValue,
  customerName,
  className = "",
}: BlackRoseCardProps) {
  const displayPhone = phone
    ? phone.replace(/^\+?966|^00966|^0/, "966")
    : "966XXXXXXXXX";

  const sarNum = typeof sarValue === "number"
    ? sarValue
    : typeof sarValue === "string"
      ? parseFloat(sarValue)
      : points * 0.02;

  const displaySar = sarNum.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      style={{
        borderRadius: "16px",
        background: "linear-gradient(160deg, #141414 0%, #1e1e1e 45%, #0c0c0c 100%)",
        aspectRatio: "85.6 / 53.98",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,169,110,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
        width: "100%",
      }}
      data-testid="loyalty-card"
    >
      {/* ── subtle shimmer ── */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 60% 40% at 75% 10%, rgba(201,169,110,0.08) 0%, transparent 100%)" }}/>

      {/* ── Floral decoration (bottom-left) ── */}
      <FloralDecoration />

      {/* ── NFC icon (top-left) ── */}
      <div style={{ position:"absolute", top:"10%", left:"6%", transform:"scaleX(-1)" }}>
        <NfcIcon size={22} />
      </div>

      {/* ── Chip (left, below NFC) ── */}
      <div style={{ position:"absolute", top:"30%", left:"6%" }}>
        <CardChip width={44} />
      </div>

      {/* ── Logo (top-right) ── */}
      <div style={{ position:"absolute", top:"8%", right:"6%", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
        <img
          src={blackroseLogo}
          alt="Black Rose"
          style={{ width:28, height:28, objectFit:"contain",
            filter:"sepia(1) saturate(2.8) hue-rotate(5deg) brightness(1.2)" }}
        />
        <span style={{ color:"#C9A96E", fontWeight:900, fontSize:9, letterSpacing:"0.18em", lineHeight:1.2, textAlign:"center" }}>
          BLACK ROSE
        </span>
        <span style={{ color:"#9a7a42", fontSize:7, letterSpacing:"0.4em", lineHeight:1 }}>
          CAFE
        </span>
      </div>

      {/* ── Phone number (center, card number style) ── */}
      <div style={{ position:"absolute", top:"50%", left:"6%", right:"6%", transform:"translateY(-50%)" }}>
        <p
          dir="ltr"
          style={{
            color:"#C9A96E",
            fontFamily:"'Courier New', Courier, monospace",
            fontWeight:700,
            fontSize:"clamp(14px, 3.8vw, 22px)",
            letterSpacing:"0.16em",
            margin:0,
            textShadow:"0 0 18px rgba(201,169,110,0.25)",
          }}
          data-testid="text-phone-display"
        >
          {displayPhone}
        </p>
        {customerName && (
          <p style={{ color:"#C9A96E66", fontSize:"clamp(9px,2vw,12px)", margin:"3px 0 0", letterSpacing:"0.05em" }}>
            {customerName}
          </p>
        )}
      </div>

      {/* ── Small floral decoration (bottom-right corner, behind points) ── */}
      <svg
        viewBox="0 0 80 90"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position:"absolute", bottom:0, right:0, width:"20%", opacity:0.35, pointerEvents:"none" }}
      >
        <path d="M60 90 Q50 65 45 45" stroke="#4a7c59" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <ellipse cx="40" cy="42" rx="12" ry="6" fill="#3d6b48" transform="rotate(-40 40 42)"/>
        <g transform="translate(45 28)">
          {[0,60,120,180,240,300].map((angle, i) => (
            <ellipse
              key={i}
              cx={Math.cos((angle * Math.PI) / 180) * 8}
              cy={Math.sin((angle * Math.PI) / 180) * 8}
              rx="4.5"
              ry="2.5"
              fill="#cce8dc"
              transform={`rotate(${angle} ${Math.cos((angle * Math.PI) / 180) * 8} ${Math.sin((angle * Math.PI) / 180) * 8})`}
            />
          ))}
          <circle cx="0" cy="0" r="3.5" fill="#e8d870" opacity="0.9"/>
        </g>
      </svg>

      {/* ── Points block (bottom-right) ── */}
      <div style={{ position:"absolute", bottom:"10%", right:"6%", textAlign:"right" }}>
        <p style={{ color:"#C9A96E", fontSize:"clamp(9px,2vw,11px)", fontWeight:700,
          letterSpacing:"0.08em", margin:0 }}>
          نقاطي
        </p>
        <p
          style={{
            color:"#C9A96E",
            fontWeight:900,
            fontSize:"clamp(22px,6vw,36px)",
            lineHeight:1.05,
            margin:0,
            textShadow:"0 0 20px rgba(201,169,110,0.4)",
          }}
          data-testid="text-points"
        >
          {points.toLocaleString()}
        </p>
        <p style={{ color:"#a88a50", fontSize:"clamp(9px,2vw,11px)", margin:"2px 0 0", letterSpacing:"0.04em" }}
          data-testid="text-sar-value">
          {displaySar} ريال
        </p>
      </div>
    </div>
  );
}
