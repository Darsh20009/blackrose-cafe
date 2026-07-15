/**
 * ShadowHtml — renders an arbitrary HTML string inside a Shadow DOM root.
 * This fully isolates the injected styles from the rest of the app, which is
 * critical for receipt previews (they carry their own inline CSS that must not
 * bleed into or be overridden by the parent document's Tailwind styles).
 */
import { useEffect, useRef } from "react";

interface ShadowHtmlProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ShadowHtml({ html, className, style }: ShadowHtmlProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);

  // Create shadow root once
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!shadowRef.current) {
      shadowRef.current = host.attachShadow({ mode: "open" });
    }
  }, []);

  // Update shadow content whenever html changes
  useEffect(() => {
    if (!shadowRef.current) return;
    shadowRef.current.innerHTML = html;
  }, [html]);

  return <div ref={hostRef} className={className} style={style} />;
}
