"use client";

import * as React from "react";

type Turnstile = { render: (el: HTMLElement, opts: { sitekey: string }) => string; remove: (id: string) => void };
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<Turnstile> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject()));
    s.addEventListener("error", () => reject());
  });
}

/** Cloudflare Turnstile ("robot emasman" tekshiruvi). Formaga cf-turnstile-response maydonini qo'shadi. */
export function Captcha({ siteKey }: { siteKey: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    let id: string | null = null;
    let cancelled = false;
    loadScript()
      .then((ts) => {
        if (!cancelled && ref.current) id = ts.render(ref.current, { sitekey: siteKey });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey]);
  return <div ref={ref} className="min-h-[65px]" />;
}
