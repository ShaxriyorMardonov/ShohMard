"use client";

import * as React from "react";

/** Rasm yuklanguncha (yoki xato berguncha) kutish. */
function loaded(img: HTMLImageElement) {
  if (img.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

/** ?print=1 bilan ochilganda shriftlar va rasmlar yuklangach PDF saqlash oynasini ochadi. */
export function AutoPrint() {
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(loaded));
      if (!cancelled) setTimeout(() => window.print(), 300);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
