export const DEFAULT_PROFILE_TIMEZONE = "Europe/Moscow";

export type SlotFormValues = {
  date: string;
  time: string;
};

export function slotFormValues(
  offsetMs: number,
  timeZone: string = DEFAULT_PROFILE_TIMEZONE
): SlotFormValues {
  const instant = new Date(Date.now() + offsetMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${String(Number(value("hour")) % 24).padStart(2, "0")}:${value("minute")}`,
  };
}

export function tomorrowAt(time: string, timeZone?: string): SlotFormValues {
  return { date: slotFormValues(24 * 60 * 60 * 1000, timeZone).date, time };
}

export function roundedTime(time: string, stepMinutes = 5): string {
  const [hours, minutes] = time.split(":").map(Number);
  const rounded = Math.floor(minutes / stepMinutes) * stepMinutes;
  return `${String(hours).padStart(2, "0")}:${String(rounded).padStart(2, "0")}`;
}

export function yesterdayDate(): string {
  return slotFormValues(-24 * 60 * 60 * 1000).date;
}
