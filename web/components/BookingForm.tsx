"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import DateRangeCalendar from "./DateRangeCalendar";
import HourRangePicker from "./HourRangePicker";

type Props = {
  spaceId: string;
  lang: Lang;
  t: Translator;
  isLoggedIn: boolean;
  initialMoveIn: string;
  initialMoveOut: string;
};

type AvailabilityState = "" | "checking" | "available" | "unavailable";

// Ported from the <script> block in app/templates/detail.html.
export default function BookingForm({ spaceId, lang, t, isLoggedIn, initialMoveIn, initialMoveOut }: Props) {
  const [moveIn, setMoveIn] = useState(initialMoveIn);
  const [moveOut, setMoveOut] = useState(initialMoveOut);
  const [availability, setAvailability] = useState<AvailabilityState>("");
  // Hourly booking (e.g. "just need it for 3 hours") only makes sense for a
  // single selected day. There's no separate checkbox for it -- as soon as
  // move-in and move-out are the same day, the time fields just show up
  // directly; leaving them blank books the whole day, filling them in
  // books only those hours.
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [customPeriod, setCustomPeriod] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [calendarRefreshToken, setCalendarRefreshToken] = useState(0);

  const isSingleDay = Boolean(moveIn && moveOut && moveIn === moveOut);
  const useHours = isSingleDay && Boolean(startTime) && Boolean(endTime);

  useEffect(() => {
    if (!isSingleDay && (startTime || endTime)) {
      setStartTime("");
      setEndTime("");
    }
  }, [isSingleDay, startTime, endTime]);

  // null = unknown/not yet checked, true/false once checked -- mirrors
  // `isAvailable` in the original script.
  const isAvailableRef = useRef<boolean | null>(null);
  const checkTokenRef = useRef(0);

  async function checkAvailability(mIn: string, mOut: string, mInTime: string, mOutTime: string) {
    isAvailableRef.current = null;
    if (!mIn || !mOut) {
      setAvailability("");
      return;
    }
    if (mOut < mIn) {
      setAvailability("unavailable");
      return;
    }
    const useHours = mIn === mOut && mInTime && mOutTime;
    if (useHours && mOutTime <= mInTime) {
      setAvailability("unavailable");
      return;
    }

    const myToken = ++checkTokenRef.current;
    setAvailability("checking");

    try {
      const params = new URLSearchParams({ move_in: mIn, move_out: mOut });
      if (useHours) {
        params.set("move_in_time", mInTime);
        params.set("move_out_time", mOutTime);
      }
      const res = await fetch(`/api/spaces/${spaceId}/availability?` + params.toString());
      if (myToken !== checkTokenRef.current) return; // a newer check superseded this one
      if (!res.ok) {
        setAvailability("");
        return;
      }
      const data = await res.json();
      isAvailableRef.current = data.available;
      setAvailability(data.available ? "available" : "unavailable");
    } catch {
      if (myToken !== checkTokenRef.current) return;
      setAvailability("");
    }
  }

  useEffect(() => {
    if (!moveIn || !moveOut) return;
    const handle = setTimeout(() => checkAvailability(moveIn, moveOut, startTime, endTime), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveIn, moveOut, startTime, endTime]);

  useEffect(() => {
    if (initialMoveIn && initialMoveOut) checkAvailability(initialMoveIn, initialMoveOut, "", "");
    // Check immediately on mount if dates were prefilled from search --
    // the debounced effect above only fires on subsequent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isLoggedIn) {
      const params = new URLSearchParams({ lang, next: "/listing/" + spaceId });
      window.location.href = "/login?" + params.toString();
      return;
    }

    if (!moveIn || !moveOut) {
      setError(lang === "de" ? "Bitte Ein- und Auszugsdatum wählen." : "Please pick a move-in and move-out date.");
      return;
    }

    if (isSingleDay && (startTime || endTime) && !(startTime && endTime)) {
      setError(lang === "de" ? "Bitte Start- und Endzeit wählen." : "Please pick a start and end time.");
      return;
    }
    if (useHours && endTime <= startTime) {
      setError(t.notAvailableDates);
      return;
    }

    if (isAvailableRef.current === false) {
      setError(t.notAvailableDates);
      return;
    }
    if (isAvailableRef.current === null) {
      await checkAvailability(moveIn, moveOut, useHours ? startTime : "", useHours ? endTime : "");
      if (isAvailableRef.current === false) {
        setError(t.notAvailableDates);
        return;
      }
    }

    setSubmitting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        space_id: spaceId,
        move_in_date: moveIn,
        move_out_date: moveOut,
        move_in_time: useHours ? startTime : null,
        move_out_time: useHours ? endTime : null,
        custom_period_note: customPeriod ? note : "",
      }),
    });

    if (res.ok) {
      setSent(true);
    } else {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    }
    // Either outcome means the calendar's cached booked/blocked list is now
    // stale (this attempt just changed it, or was rejected because it
    // already had) -- refresh so the rest of the grid catches up too.
    setCalendarRefreshToken((n) => n + 1);
  }

  if (sent) {
    return <p style={{ color: "var(--green-deep)", fontWeight: 600 }}>{t.reservationConfirmed}</p>;
  }

  return (
    <form onSubmit={onSubmit}>
      <DateRangeCalendar
        spaceId={spaceId}
        lang={lang}
        t={t}
        moveIn={moveIn}
        moveOut={moveOut}
        onChange={(nextMoveIn, nextMoveOut) => {
          setMoveIn(nextMoveIn);
          setMoveOut(nextMoveOut);
        }}
        selectionStatus={availability}
        refreshToken={calendarRefreshToken}
      />

      {isSingleDay && (
        <HourRangePicker
          startTime={startTime}
          endTime={endTime}
          onStartChange={setStartTime}
          onEndChange={setEndTime}
          t={t}
          lang={lang}
        />
      )}

      {availability && (
        <div className={`availability-status ${availability}`}>
          {availability === "checking" && t.checkingAvailability}
          {availability === "available" && t.availableDates}
          {availability === "unavailable" && t.notAvailableDates}
        </div>
      )}

      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, cursor: "pointer" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={customPeriod}
            onChange={(e) => setCustomPeriod(e.target.checked)}
          />
          {t.requestCustomPeriod}
        </label>
        {customPeriod && (
          <textarea
            rows={2}
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontFamily: "inherit",
              fontSize: 13.5,
            }}
            placeholder={`${t.requestCustomPeriod}...`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </div>

      <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting}>
        {t.reserveNow}
      </button>
      {error && <div className="form-error visible">{error}</div>}
    </form>
  );
}
