"use client";

import { useEffect, useRef } from "react";
import type { Lang, Translator, CATEGORIES } from "@/lib/translations";

type Props = {
  lang: Lang;
  categories: typeof CATEGORIES;
  t: Translator;
};

// Ported from initCategoryCarousel() in app/static/js/main.js. Two
// generations of the seamless-loop-wrap bug fixed here:
//
// 1. The original only corrected the wrap point (loopIfNeeded) while
//    neither dragging nor auto-scrolling, so a drag/swipe that crossed the
//    boundary left scrollLeft out of range until release -- then the next
//    frame snapped it back hard.
// 2. The first fix for that ran loopIfNeeded() unconditionally every
//    frame instead, which fixed the desktop mouse-drag case (JS owns
//    scrollLeft during a mouse drag, so correcting it mid-drag is safe) but
//    was still glitchy on phones: during a touch gesture the *browser*
//    owns scrollLeft via native momentum physics, and yanking it out from
//    under that mid-gesture reads as a stutter/jump even though it's no
//    longer a hard snap.
//
// The actual fix: only correct the wrap point when nothing native is
// animating. That's true immediately after our own JS-driven scrollLeft
// changes (auto-drift, mouse-drag -- safe to correct every frame), but for
// touch it means waiting for the `scrollend` event (fires once *all*
// scrolling, including momentum/inertia, has fully settled), with a
// debounced `scroll` listener as a fallback for browsers without
// `scrollend` support. Because the track is a duplicated set, sitting
// anywhere in the second copy is already visually correct -- the
// correction is only ever about resetting the number for the next lap, so
// deferring it until the carousel is genuinely still makes it invisible.
// Width is also re-measured once the custom font finishes loading, since
// it's measured on mount, before a late-loading font can reflow layout.
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

    // Debounced fallback for browsers without `scrollend` (mainly older
    // Safari) -- if no scroll event fires for 120ms, treat that as settled.
    let scrollIdleTimer: ReturnType<typeof setTimeout>;
    const onScrollForIdleFallback = () => {
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(loopIfNeeded, 120);
    };
    const supportsScrollEnd = "onscrollend" in window;
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
    if (supportsScrollEnd) {
      track.addEventListener("scrollend", loopIfNeeded);
    } else {
      track.addEventListener("scroll", onScrollForIdleFallback);
    }
    window.addEventListener("resize", onResize);

    function tick() {
      if (!autoScrollPaused && !isDown) {
        track!.scrollLeft += 0.4; // slow, continuous drift
        loopIfNeeded(); // safe: this scroll position is entirely JS-driven
      } else if (isDown) {
        loopIfNeeded(); // safe: mouse-drag also sets scrollLeft synchronously in JS
      }
      // While a touch gesture (or its momentum) might be in progress,
      // scrollLeft is native/browser-owned -- correcting it here would
      // fight that physics. scrollend (or the idle-fallback above) handles
      // the wrap for that case instead, once it's actually safe to.
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
      clearTimeout(scrollIdleTimer);
      track.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      track.removeEventListener("click", onTrackClickCapture, true);
      track.removeEventListener("mouseenter", onMouseEnter);
      track.removeEventListener("mouseleave", onMouseLeave);
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchend", onTouchEnd);
      track.removeEventListener("scroll", onScroll);
      if (supportsScrollEnd) {
        track.removeEventListener("scrollend", loopIfNeeded);
      } else {
        track.removeEventListener("scroll", onScrollForIdleFallback);
      }
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
