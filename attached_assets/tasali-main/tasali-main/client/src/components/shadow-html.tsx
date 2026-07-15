import { useEffect, useRef } from "react";

interface ShadowHtmlProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders arbitrary HTML in an isolated iframe so its styles don't
 * bleed into the host page and host styles don't affect the preview.
 * Used for receipt / invoice print previews in the POS.
 */
export function ShadowHtml({ html, className, style }: ShadowHtmlProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    // Auto-resize to content height once loaded
    const resize = () => {
      try {
        const h = doc.documentElement.scrollHeight;
        if (h > 0) iframe.style.height = `${h}px`;
      } catch {}
    };
    iframe.addEventListener("load", resize);
    resize();
    return () => iframe.removeEventListener("load", resize);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={{ border: "none", width: "100%", ...style }}
      title="receipt-preview"
      sandbox="allow-same-origin"
    />
  );
}
