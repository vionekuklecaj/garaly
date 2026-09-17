"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { UnavailableRange } from "@/lib/types";

type Props = {
  spaceId: string;
  lang: Lang;
  t: Translator;
  moveIn: string;
  moveOut: string;
  onChange: (moveIn: string, moveOut: string) => void;
};

// Local-date formatting -- deliberately not toISOString(), which converts
// to UTC and can shift a date by a day depending on the browser's local
// timezone offset. These are calendar dates (no time component), so they
// need to stay exactly what the user clicked.
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

// 6 full weeks (42 days), Monday-first, including the leading/trailing
// days from adjacent months needed to fill the grid.
function monthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const leadingBlanks = (first.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat -> Monday-first offset
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - leadingBlanks + i));
}

export default function DateRangeCalendar({ spaceId, lang, t, moveIn, moveOut, onChange }: Props) {
  const [ranges, setRanges] = useState<UnavailableRange[] | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    fetch(`/api/spaces/${spaceId}/unavailable-dates`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRanges)
      .catch(() => setRanges([]));
  }, [spaceId]);

  const todayStr = toISODate(new Date());
  const locale = lang === "de" ? "de-DE" : "en-US";

  const isUnavailable = useMemo(() => {
    const list = ranges || [];
    return (dateStr: string) => list.some((r) => r.move_in_date <= dateStr && dateStr <= r.move_out_date);
  }, [ranges]);

  function rangeHasConflict(start: string, end: string): boolean {
    return (ranges || []).some((r) => start <= r.move_out_date && r.move_in_date <= end);
  }

  function onDayClick(dateStr: string) {
    if (dateStr < todayStr || isUnavailable(dateStr)) return;

    if (!moveIn || (moveIn && moveOut)) {
      // Nothing selected yet, or a full range was already picked -- start fresh.
      onChange(dateStr, "");
      return;
    }
    // moveIn is set, moveOut isn't -- this click sets the end.
    if (dateStr <= moveIn || rangeHasConflict(moveIn, dateStr)) {
      // Picked before the start, or the range crosses a booked stretch --
      // treat as a new start instead of a confusing invalid range.
      onChange(dateStr, "");
      return;
    }
    onChange(moveIn, dateStr);
  }

  const weekdayLabels = useMemo(() => {
    // A Monday-anchored reference week, formatted short, so this follows
    // the locale's own weekday ordering/spelling without hardcoding names.
    const base = new Date(2026, 0, 5); // a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    });
  }, [locale]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
  const days = useMemo(() => monthGrid(month), [month]);
  const canGoBack = startOfMonth(new Date()) < month;

  return (
    <div className="cal">
      <div className="cal-selected-row">
        <div>
          <div className="cal-selected-label">{t.searchMoveIn}</div>
          <div className="cal-selected-value">{moveIn || "—"}</div>
        </div>
        <div>
          <div className="cal-selected-label">{t.searchMoveOut}</div>
          <div className="cal-selected-value">{moveOut || "—"}</div>
        </div>
      </div>

      <div className="cal-nav">
        <button type="button" className="cal-nav-btn" onClick={() => setMonth((m) => addMonths(m, -1))} disabled={!canGoBack} aria-label="Previous month">
          ‹
        </button>
        <div className="cal-month-label">{monthLabel}</div>
        <button type="button" className="cal-nav-btn" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="cal-weekdays">
        {weekdayLabels.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="cal-grid">
        {days.map((d) => {
          const dateStr = toISODate(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isPast = dateStr < todayStr;
          const unavailable = isUnavailable(dateStr);
          const isStart = dateStr === moveIn;
          const isEnd = dateStr === moveOut;
          const inRange = moveIn && moveOut && dateStr > moveIn && dateStr < moveOut;
          const disabled = isPast || unavailable || !inMonth;

          const classes = ["cal-day"];
          if (!inMonth) classes.push("cal-day-outside");
          else if (isPast) classes.push("cal-day-past");
          else if (unavailable) classes.push("cal-day-booked");
          else classes.push("cal-day-available");
          if (isStart || isEnd) classes.push("cal-day-selected");
          else if (inRange) classes.push("cal-day-inrange");

          return (
            <button
              type="button"
              key={dateStr}
              className={classes.join(" ")}
              disabled={disabled}
              onClick={() => onDayClick(dateStr)}
              title={unavailable ? t.calLegendBooked : undefined}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span className="cal-dot cal-dot-available" /> {t.calLegendAvailable}
        <span className="cal-dot cal-dot-booked" /> {t.calLegendBooked}
      </div>
    </div>
  );
}
