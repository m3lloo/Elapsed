const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Download a one-event .ics file (opens in Apple, Google and Outlook calendars). Includes a day-before reminder. */
export function downloadIcs(title: string, at: Date, note = "") {
  const end = new Date(at.getTime() + 60 * 60 * 1000);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Elapsed//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${stamp(at)}-${Math.random().toString(36).slice(2, 8)}@elapsed`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(at)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`,
    ...(note ? [`DESCRIPTION:${esc(note)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\W+/g, "-")}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
