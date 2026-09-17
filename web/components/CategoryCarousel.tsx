"use client";

import { useEffect, useRef } from "react";
import type { Lang, Translator, CATEGORIES } from "@/lib/translations";

type Props = {
  lang: Lang;
  categories: typeof CATEGORIES;
  t: Translator;
};

// Ported from initCategoryCarousel() in app/static/js/main.js. Three
// generations of the touch glitch fixed here, each patch making the last
// one's assumption wrong:
//
// 1. Original: only corrected the seamless-loop wrap point while neither
//    dragging nor auto-scrolling -- a swipe that crossed the wrap boundary
//    left scrollLeft out of range until release, then snapped back hard.
// 2. Fix #1: ran the wrap-correction unconditionally every frame instead.
//    Fixed desktop mouse-drag (JS owns scrollLeft there) but still
//    glitched on phones: during a touch gesture the *browser* owns
//    scrollLeft via native momentum physics, and yanking it out from
//    under that every frame reads as a stutter.
// 3. Fix #2: deferred the correction to the `scrollend` event instead
//    (fires once all scrolling, including momentum, has settled) so JS
//    would never touch scrollLeft mid-gesture. Still reported as
//    "shaking uncontrollably" on phone -- `scrollend` firing early or
//    repeatedly during an active gesture on some mobile browsers (a real,
//    documented inconsistency for a still-fairly-new API) means the
//    exact thing this was meant to prevent could still happen. Also found
//    a second, independent bug in this generation: the center-highlight
//    effect scheduled a fresh requestAnimationFrame on *every* scroll
//    event with no guard against one already being pending, so a fast
//    swipe (many scroll events in quick succession) could queue up many
//    of them, each doing a full layout-forcing pass over every card --
//    real, measurable jank on a phone, independent of the loop bug.
//
// The actual fix: stop trying to make a JS-driven scrollLeft loop coexist
// with native touch physics at all. Touch devices (detected once via
// `pointer: coarse`, the standard "primary input is a finger" check) get
// a plain, native horizontally-scrollable row -- no auto-drift, no loop
// correction, no drag handlers, nothing ever touches scrollLeft. Native
// touch scrolling that JS never interferes with cannot glitch, by
// construction. The auto-scrolling seamless-loop flourish is kept for
// desktop only, where scrollLeft is always JS-driven (the drift itself,
// or a mouse drag) and never fought against real momentum physics -- that
// part was never actually the source of the touch bugs.
export default function CategoryCarousel({ lang, categories, t }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const originalItems = Array.from(track.children) as HTMLElement[];
    if (!originalItems.length) return;

    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    // Only duplicated for the desktop loop illusion -- a touch device just
    // shows the categories once and scrolls normally to the end.
    let items = originalItems;
    if (!isTouch) {
      originalItems.forEach((item) => track.appendChild(item.cloneNode(true)));
      items = Array.from(track.children) as HTMLElement[];
    }

    // rAF-throttled regardless of device: guards against queuing more than
    // one pending update, which is what made this expensive on a fast swipe.
    let centerEmphasisScheduled = false;
    function updateCenterEmphasis() {
      centerEmphasisScheduled = false;
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
    function scheduleCenterEmphasis() {
      if (centerEmphasisScheduled) return;
      centerEmphasisScheduled = true;
      requestAnimationFrame(updateCenterEmphasis);
    }

    track.addEventListener("scroll", scheduleCenterEmphasis, { passive: true });
    updateCenterEmphasis();

    if (isTouch) {
      // That's the entire touch setup. Native overflow-x:auto and native
      // swipe-to-scroll handle everything else -- no JS in the loop at all.
      return () => {
        track.removeEventListener("scroll", scheduleCenterEmphasis);
      };
    }

    // ---------------- Desktop only from here down ----------------
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
    const onResize = () => measure();

    track.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    track.addEventListener("click", onTrackClickCapture, true);
    track.addEventListener("mouseenter", onMouseEnter);
    track.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("resize", onResize);

    function tick() {
      if (!autoScrollPaused && !isDown) {
        track!.scrollLeft += 0.4; // slow, continuous drift
      }
      // Always safe here -- this branch only ever runs on non-touch
      // devices, so scrollLeft is never native/momentum-owned.
      loopIfNeeded();
      rafId = requestAnimationFrame(tick);
    }

    measure();
    rafId = requestAnimationFrame(tick);

    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(rafId);
      track.removeEventListener("scroll", scheduleCenterEmphasis);
      track.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      track.removeEventListener("click", onTrackClickCapture, true);
      track.removeEventListener("mouseenter", onMouseEnter);
      track.removeEventListener("mouseleave", onMouseLeave);
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
