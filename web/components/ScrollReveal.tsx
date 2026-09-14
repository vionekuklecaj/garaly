"use client";

import { useEffect } from "react";

// Ported from initScrollReveal() in app/static/js/main.js. Applies to any
// element with class "reveal" (fades/slides in once, the moment it enters
// the viewport) or "reveal-stagger" (same, but its direct children animate
// in with a small delay between each). Runs once per page after mount and
// re-scans on route content change via the effect's re-run on `deps`.
export default function ScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(".reveal, .reveal-stagger");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
