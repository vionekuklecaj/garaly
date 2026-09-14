"use client";

import { useEffect, useRef } from "react";
import type { Lang, Translator, CATEGORIES } from "@/lib/translations";

type Props = {
  lang: Lang;
  categories: typeof CATEGORIES;
  t: Translator;
};

// Ported from initCategoryCarousel() in app/static/js/main.js, with the
// snap-back glitch fixed: the original only corrected the seamless-loop
// wrap point (loopIfNeeded) while the carousel was neither being dragged
// nor auto-scrolling, so a drag/swipe that crossed the wrap boundary left
// scrollLeft out of range until release -- then the very next frame
// snapped it back hard. Wrapping now runs unconditionally every frame, so
// the position never drifts out of range in the first place. Width is
// also re-measured once the custom font finishes loading, since it's
// measured on mount, before a late-loading font can reflow layout.
export default function CategoryCarousel({ lang, categories, t }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const originalItems = Array.from(track.children) as HTMLElement[];
    if (!originalItems.length) return;

    // Duplicate the set once so we can loop without a visible jump.
    originalItems.forEach((item) => track.appendChild(item.cloneNode(true)));
    const items = Array.from(track.children) as HTMLElement[];

    let isDown = false;
    let dragged = false;
    let startX = 0;
    let startScroll = 0;
    let autoScrollPaused = false;
    let halfWidth = 0;
    let rafId = 0;

    function measure() {
      halfWidth = track!.scrollWidth / 2;
    }

    function updateCenterEmphasis() {
      const containerRect = track!.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      let closest: HTMLElement | null = null;
      let closestDist = Infinity;

      items.forEach((item) => {
        const r = item.getBoundingClientRect();
        const itemCenter = r.left + r.width / 2;
        const dist = Math.abs(itemCenter - centerX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = item;
        }
        item.classList.remove("is-center");
      });
      if (closest) (closest as HTMLElement).classList.add("is-center");
    }

    function loopIfNeeded() {
      if (halfWidth <= 0) return;
      if (track!.scrollLeft >= halfWidth) {
        track!.scrollLeft -= halfWidth;
      } else if (track!.scrollLeft <= 0) {
        track!.scrollLeft += halfWidth;
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      dragged = false;
      track!.classList.add("dragging");
      startX = e.pageX;
      startScroll = track!.scrollLeft;
    };
    const onMouseUp = () => {
      isDown = false;
      track!.classList.remove("dragging");
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      track!.scrollLeft = startScroll - dx;
    };
    const onTrackClickCapture = (e: MouseEvent) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onMouseEnter = () => (autoScrollPaused = true);
    const onMouseLeave = () => (autoScrollPaused = false);
    const onTouchStart = () => (autoScrollPaused = true);
    let touchEndTimeout: ReturnType<typeof setTimeout>;
    const onTouchEnd = () => {
      touchEndTimeout = setTimeout(() => (autoScrollPaused = false), 1500);
    };
    const onScroll = () => requestAnimationFrame(updateCenterEmphasis);
    const onResize = () => measure();

    track.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    track.addEventListener("click", onTrackClickCapture, true);
    track.addEventListener("mouseenter", onMouseEnter);
    track.addEventListener("mouseleave", onMouseLeave);
    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchend", onTouchEnd, { passive: true });
    track.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);

    function tick() {
      if (!autoScrollPaused && !isDown) {
        track!.scrollLeft += 0.4; // slow, continuous drift
      }
      // Unlike the original, this runs every frame regardless of
      // interaction state -- that's the fix for the drag/swipe snap-back.
      loopIfNeeded();
      rafId = requestAnimationFrame(tick);
    }

    measure();
    updateCenterEmphasis();
    rafId = requestAnimationFrame(tick);

    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(touchEndTimeout);
      track.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      track.removeEventListener("click", onTrackClickCapture, true);
      track.removeEventListener("mouseenter", onMouseEnter);
      track.removeEventListener("mouseleave", onMouseLeave);
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchend", onTouchEnd);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="category-carousel-wrap">
      <div className="category-carousel" ref={trackRef}>
        {categories.map((c) => (
          <a key={c.key} className="category-card" href={`/search?category=${c.key}&lang=${lang}`}>
            <div className="category-icon">{c.icon}</div>
            <div className="name">{c[lang]}</div>
            <div className="desc">{t[c.desc_key as keyof typeof t]}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
