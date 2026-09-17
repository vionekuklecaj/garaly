"use client";

import type { Translator } from "@/lib/translations";

type Props = {
  startTime: string;
  endTime: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  t: Translator;
  lang: "de" | "en";
};

// Half-hour slots, 00:00 through 23:30.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function durationLabel(start: string, end: string, lang: "de" | "en"): string | null {
  if (!start || !end || end <= start) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = eh * 60 + em - (sh * 60 + sm);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (h) parts.push(lang === "de" ? `${h} Std.` : `${h}h`);
  if (m) parts.push(lang === "de" ? `${m} Min.` : `${m}m`);
  return parts.join(" ");
}

// Replaces raw <input type="time"> (a native browser widget that looks
// nothing like the rest of this app's design) with styled dropdowns in a
// dedicated card, matching how the calendar/booking-card already look.
export default function HourRangePicker({ startTime, endTime, onStartChange, onEndChange, t, lang }: Props) {
  const duration = durationLabel(startTime, endTime, lang);

  return (
    <div className="hour-picker">
      <div className="hour-picker-label">{t.bookByHour}</div>
      <div className="hour-picker-hint">{t.hourlyOnlySameDay}</div>

      <div className="hour-picker-row">
        <div className="hour-picker-field">
          <label>{t.startTime}</label>
          <select value={startTime} onChange={(e) => onStartChange(e.target.value)}>
            <option value=""></option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <span className="hour-picker-arrow">→</span>

        <div className="hour-picker-field">
          <label>{t.endTime}</label>
          <select value={endTime} onChange={(e) => onEndChange(e.target.value)}>
            <option value=""></option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time} disabled={Boolean(startTime) && time <= startTime}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      {duration && <div className="hour-picker-duration">{duration}</div>}
    </div>
  );
}
