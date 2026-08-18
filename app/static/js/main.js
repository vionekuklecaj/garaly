function currentLang() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lang") || document.cookie.match(/garaly_lang=(\w+)/)?.[1] || "de";
}

function toggleLang() {
  const next = currentLang() === "de" ? "en" : "de";
  document.cookie = `garaly_lang=${next};path=/;max-age=31536000`;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", next);
  window.location.href = url.toString();
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/?lang=" + currentLang();
}

// ---------- Scroll-reveal animations ----------
// Applies to any element with class "reveal" (fades/slides in once, the
// moment it enters the viewport) or "reveal-stagger" (same, but its direct
// children animate in with a small delay between each).
function initScrollReveal() {
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
}

// ---------- Category carousel ----------
// Horizontal, auto-scrolling, drag-to-scroll (mouse) / swipe (touch, native)
// carousel. The item nearest the horizontal center of the viewport is scaled
// up and highlighted; items are duplicated once in the DOM so the auto-scroll
// can loop seamlessly.
function initCategoryCarousel() {
  const track = document.getElementById("category-carousel");
  if (!track) return;

  const originalItems = Array.from(track.children);
  if (!originalItems.length) return;

  // Duplicate the set once so we can loop without a visible jump.
  originalItems.forEach((item) => track.appendChild(item.cloneNode(true)));
  const items = Array.from(track.children);

  let isDown = false;
  let dragged = false;
  let startX = 0;
  let startScroll = 0;
  let autoScrollPaused = false;
  let halfWidth = 0;

  function measure() {
    // Width of one full (non-duplicated) set, used for the seamless loop reset.
    halfWidth = track.scrollWidth / 2;
  }

  function updateCenterEmphasis() {
    const containerRect = track.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    let closest = null;
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
    if (closest) closest.classList.add("is-center");
  }

  function loopIfNeeded() {
    if (halfWidth <= 0) return;
    if (track.scrollLeft >= halfWidth) {
      track.scrollLeft -= halfWidth;
    } else if (track.scrollLeft <= 0) {
      track.scrollLeft += halfWidth;
    }
  }

  // Drag-to-scroll (desktop mouse). Touch devices already get native
  // swipe-to-scroll from overflow-x: auto, so this only binds mouse events.
  track.addEventListener("mousedown", (e) => {
    isDown = true;
    dragged = false;
    track.classList.add("dragging");
    startX = e.pageX;
    startScroll = track.scrollLeft;
  });
  window.addEventListener("mouseup", () => {
    isDown = false;
    track.classList.remove("dragging");
  });
  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 4) dragged = true;
    track.scrollLeft = startScroll - dx;
  });
  // Prevent the click-through to a category link right after a drag.
  track.addEventListener(
    "click",
    (e) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  track.addEventListener("mouseenter", () => (autoScrollPaused = true));
  track.addEventListener("mouseleave", () => (autoScrollPaused = false));
  track.addEventListener(
    "touchstart",
    () => (autoScrollPaused = true),
    { passive: true }
  );
  track.addEventListener(
    "touchend",
    () => setTimeout(() => (autoScrollPaused = false), 1500),
    { passive: true }
  );

  track.addEventListener("scroll", () => {
    requestAnimationFrame(updateCenterEmphasis);
  });

  window.addEventListener("resize", measure);

  function tick() {
    if (!autoScrollPaused && !isDown) {
      track.scrollLeft += 0.4; // slow, continuous drift
      loopIfNeeded();
    }
    requestAnimationFrame(tick);
  }

  measure();
  updateCenterEmphasis();
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initCategoryCarousel();
});
