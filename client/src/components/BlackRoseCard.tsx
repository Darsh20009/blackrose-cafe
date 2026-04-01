import blackroseLogo from "@assets/blackrose-logo.png";

interface BlackRoseCardProps {
  phone?: string;
  points?: number;
  sarValue?: number | string;
  customerName?: string;
  className?: string;
}

/* ══════════════════════════════════════════════════
   COLOURS  (match the reference photo exactly)
   Card bg : #0d0d0d  (near-black charcoal)
   Gold    : #C8A53A  (warm amber gold)
   Gold dim: #A8872A  (darker gold for secondary)
   Leaf    : #3A5C3A  (dark forest green)
   Petal   : #A8C8B8  (pale teal-blue)
══════════════════════════════════════════════════ */

const GOLD = "#C8A53A";
const GOLD_DIM = "#A8872A";
const LEAF = "#3A5C3A";
const LEAF_LIGHT = "#4E7A4E";
const PETAL = "#A8C8B8";
const PETAL_DARK = "#8AADA0";

/* ── Left-side botanical cluster (big, matches reference) ── */
function FloralLeft() {
  return (
    <svg
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", bottom: 0, left: 0, width: "45%", pointerEvents: "none" }}
      preserveAspectRatio="xMinYMax meet"
    >
      {/* Main stem */}
      <path d="M20 160 Q35 130 50 100 Q65 70 70 40" stroke={LEAF} strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* Branch right */}
      <path d="M50 100 Q75 88 95 95" stroke={LEAF} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Branch left */}
      <path d="M35 130 Q18 115 10 118" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Small branch upper */}
      <path d="M60 70 Q78 62 88 70" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round"/>

      {/* Large leaf 1 — bottom left */}
      <ellipse cx="12" cy="115" rx="20" ry="9" fill={LEAF} transform="rotate(30 12 115)" opacity="0.9"/>
      {/* Large leaf 2 — bottom center */}
      <ellipse cx="38" cy="128" rx="22" ry="9" fill={LEAF_LIGHT} transform="rotate(-20 38 128)" opacity="0.85"/>
      {/* Leaf 3 — right branch */}
      <ellipse cx="90" cy="92" rx="20" ry="8" fill={LEAF} transform="rotate(-10 90 92)" opacity="0.8"/>
      <ellipse cx="78" cy="98" rx="16" ry="7" fill={LEAF_LIGHT} transform="rotate(15 78 98)" opacity="0.75"/>
      {/* Leaf 4 — upper */}
      <ellipse cx="82" cy="67" rx="17" ry="7" fill={LEAF} transform="rotate(-35 82 67)" opacity="0.8"/>
      {/* Leaf 5 — middle left */}
      <ellipse cx="28" cy="108" rx="18" ry="7" fill={LEAF_LIGHT} transform="rotate(50 28 108)" opacity="0.7"/>

      {/* Small gold berry dots */}
      <circle cx="55" cy="38" r="3" fill={GOLD_DIM} opacity="0.7"/>
      <circle cx="62" cy="32" r="2.2" fill={GOLD_DIM} opacity="0.6"/>
      <circle cx="48" cy="35" r="2.5" fill={GOLD_DIM} opacity="0.55"/>
      <circle cx="70" cy="38" r="2" fill={GOLD_DIM} opacity="0.5"/>

      {/* Big flower 1 (center-right of cluster) */}
      <g transform="translate(95 93)">
        {[0,40,80,120,160,200,240,280,320].map((a, i) => {
          const r = 14;
          const cx = Math.cos((a * Math.PI) / 180) * r;
          const cy = Math.sin((a * Math.PI) / 180) * r;
          return (
            <ellipse
              key={i}
              cx={cx} cy={cy}
              rx="7" ry="3.5"
              fill={i % 2 === 0 ? PETAL : PETAL_DARK}
              transform={`rotate(${a} ${cx} ${cy})`}
              opacity="0.95"
            />
          );
        })}
        <circle cx="0" cy="0" r="5.5" fill="#E8D060"/>
        <circle cx="0" cy="0" r="3" fill="#C4A820"/>
      </g>

      {/* Smaller flower 2 (left side, lower) */}
      <g transform="translate(18 112)">
        {[0,51,102,153,204,255,306].map((a, i) => {
          const r = 11;
          const cx = Math.cos((a * Math.PI) / 180) * r;
          const cy = Math.sin((a * Math.PI) / 180) * r;
          return (
            <ellipse
              key={i}
              cx={cx} cy={cy}
              rx="5.5" ry="2.8"
              fill={i % 2 === 0 ? PETAL : PETAL_DARK}
              transform={`rotate(${a} ${cx} ${cy})`}
              opacity="0.9"
            />
          );
        })}
        <circle cx="0" cy="0" r="4.5" fill="#E8D060"/>
        <circle cx="0" cy="0" r="2.5" fill="#C4A820"/>
      </g>
    </svg>
  );
}

/* ── Right-side small botanical (matches reference) ── */
function FloralRight() {
  return (
    <svg
      viewBox="0 0 90 110"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", bottom: 0, right: 0, width: "22%", pointerEvents: "none" }}
      preserveAspectRatio="xMaxYMax meet"
    >
      <path d="M70 110 Q55 85 48 60" stroke={LEAF} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="40" cy="58" rx="18" ry="7" fill={LEAF} transform="rotate(-30 40 58)" opacity="0.85"/>
      <ellipse cx="58" cy="68" rx="15" ry="6" fill={LEAF_LIGHT} transform="rotate(15 58 68)" opacity="0.8"/>

      <g transform="translate(48 45)">
        {[0,51,102,153,204,255,306].map((a, i) => {
          const r = 12;
          const cx = Math.cos((a * Math.PI) / 180) * r;
          const cy = Math.sin((a * Math.PI) / 180) * r;
          return (
            <ellipse key={i} cx={cx} cy={cy} rx="6" ry="3"
              fill={i % 2 === 0 ? PETAL : PETAL_DARK}
              transform={`rotate(${a} ${cx} ${cy})`}
              opacity="0.9"
            />
          );
        })}
        <circle cx="0" cy="0" r="5" fill="#E8D060"/>
        <circle cx="0" cy="0" r="2.5" fill="#C4A820"/>
      </g>

      {/* Berry dots */}
      <circle cx="52" cy="38" r="2.5" fill={GOLD_DIM} opacity="0.65"/>
      <circle cx="46" cy="33" r="2" fill={GOLD_DIM} opacity="0.55"/>
    </svg>
  );
}

/* ── NFC contactless icon (standard symbol) ── */
function NfcIcon() {
  return (
    <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
      <circle cx="5" cy="11" r="2.2" fill={GOLD}/>
      <path d="M9 6.5 A7 7 0 0 1 9 15.5" stroke={GOLD} strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      <path d="M13 3.5 A11 11 0 0 1 13 18.5" stroke={GOLD} strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.8"/>
      <path d="M17 1 A15 15 0 0 1 17 21" stroke={GOLD} strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.55"/>
    </svg>
  );
}

/* ── Credit card EMV chip ── */
function Chip() {
  return (
    <div style={{
      width: 46, height: 34,
      background: "linear-gradient(135deg, #E8C85A 0%, #C49A18 25%, #F0DC70 50%, #B48010 75%, #D4B030 100%)",
      borderRadius: 5,
      position: "relative",
      boxShadow: "0 2px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)",
    }}>
      {/* horizontal slots */}
      <div style={{ position:"absolute", left:"18%", right:"18%", top:"25%", height:1, background:"rgba(0,0,0,0.25)" }}/>
      <div style={{ position:"absolute", left:"18%", right:"18%", bottom:"25%", height:1, background:"rgba(0,0,0,0.25)" }}/>
      {/* vertical slots */}
      <div style={{ position:"absolute", top:"18%", bottom:"18%", left:"28%", width:1, background:"rgba(0,0,0,0.22)" }}/>
      <div style={{ position:"absolute", top:"18%", bottom:"18%", right:"28%", width:1, background:"rgba(0,0,0,0.22)" }}/>
      {/* center contact pad */}
      <div style={{ position:"absolute", top:"25%", bottom:"25%", left:"28%", right:"28%",
        background:"rgba(160,110,0,0.35)", border:"1px solid rgba(0,0,0,0.18)", borderRadius:2 }}/>
    </div>
  );
}

export default function BlackRoseCard({
  phone, points = 0, sarValue, customerName, className = "",
}: BlackRoseCardProps) {
  /* normalise phone → 966XXXXXXXXX */
  const displayPhone = phone
    ? phone.replace(/^\+?966|^00966/, "966").replace(/^0(\d{9})$/, "966$1")
    : "966XXXXXXXXX";

  const sarNum =
    typeof sarValue === "number" ? sarValue
    : typeof sarValue === "string" ? parseFloat(sarValue) || 0
    : points * 0.02;

  const displaySar = sarNum.toLocaleString("en-SA", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      style={{
        borderRadius: 18,
        background: "linear-gradient(160deg, #121212 0%, #1a1a1a 60%, #0c0c0c 100%)",
        aspectRatio: "85.6 / 53.98",
        width: "100%",
        boxShadow:
          "0 28px 70px rgba(0,0,0,0.75), 0 0 0 1px rgba(200,165,58,0.13), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
      data-testid="loyalty-card"
    >
      {/* very subtle radial shimmer */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 55% 35% at 78% 12%, rgba(200,165,58,0.07) 0%, transparent 100%)",
      }}/>

      {/* ─── bottom-left botanical cluster ─── */}
      <FloralLeft />

      {/* ─── bottom-right small flower ─── */}
      <FloralRight />

      {/* ─── NFC symbol — top left ─── */}
      <div style={{ position:"absolute", top:"9%", left:"6%" }}>
        <NfcIcon />
      </div>

      {/* ─── Chip — left, below NFC ─── */}
      <div style={{ position:"absolute", top:"28%", left:"6%" }}>
        <Chip />
      </div>

      {/* ─── Logo — top right ─── */}
      <div style={{ position:"absolute", top:"7%", right:"6%", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
        <img
          src={blackroseLogo}
          alt="Black Rose"
          style={{
            width: 30, height: 30, objectFit:"contain",
            filter:"sepia(1) saturate(3) hue-rotate(5deg) brightness(1.25)",
          }}
        />
        <span style={{ color:GOLD, fontWeight:900, fontSize:10, letterSpacing:"0.2em", lineHeight:1.2, textAlign:"center" }}>
          BLACK ROSE
        </span>
        <span style={{ color:GOLD_DIM, fontSize:7.5, letterSpacing:"0.45em", lineHeight:1 }}>
          CAFE
        </span>
      </div>

      {/* ─── Phone number — center left ─── */}
      <div style={{ position:"absolute", top:"50%", left:"6%", transform:"translateY(-50%)" }}>
        <p
          dir="ltr"
          style={{
            color: GOLD,
            fontWeight: 700,
            fontSize: "clamp(13px, 3.6vw, 22px)",
            letterSpacing: "0.14em",
            margin: 0,
            fontFamily: "'Trebuchet MS', Arial, sans-serif",
            textShadow: `0 0 20px ${GOLD}44`,
          }}
          data-testid="text-phone-display"
        >
          {displayPhone}
        </p>
      </div>

      {/* ─── Points + SAR — bottom right ─── */}
      <div style={{ position:"absolute", bottom:"9%", right:"6%", textAlign:"right" }}>
        <p style={{ color:GOLD, fontSize:"clamp(9px,2vw,11px)", fontWeight:700, letterSpacing:"0.1em", margin:0 }}>
          نقاطي
        </p>
        <p
          style={{
            color: GOLD,
            fontWeight: 900,
            fontSize: "clamp(22px, 6vw, 36px)",
            lineHeight: 1.05,
            margin: 0,
            textShadow: `0 0 24px ${GOLD}55`,
          }}
          data-testid="text-points"
        >
          {points.toLocaleString()}
        </p>
        <p style={{ color:GOLD_DIM, fontSize:"clamp(9px,1.9vw,11px)", margin:"2px 0 0", letterSpacing:"0.05em" }}
          data-testid="text-sar-value">
          {displaySar} ريال
        </p>
      </div>
    </div>
  );
}
