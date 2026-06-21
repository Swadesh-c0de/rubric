export function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const [, hoursStr, minutesStr, modifier] = match;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (modifier.toUpperCase() === "PM" && hours < 12) hours += 12;
  if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function parseTimingRange(timingStr: string): { start: number; end: number } | null {
  if (!timingStr) return null;
  const cleanTiming = timingStr.split("|")[0];
  const parts = cleanTiming.split(/[\u2013-]/);
  if (parts.length !== 2) return null;
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  if (start === null || end === null) return null;
  return { start, end };
}

export function getRecordWeight(
  classTiming: string | null,
  status: string,
  standardDuration: number = 50
): number {
  if (status === "CANCELLED" || !classTiming) return 0;
  
  if (classTiming.includes("|w:")) {
    const parts = classTiming.split("|w:");
    const weightVal = parseInt(parts[1], 10);
    if (!isNaN(weightVal)) return weightVal;
  }

  const range = parseTimingRange(classTiming);
  if (!range) return 1;
  const duration = range.end - range.start;
  if (duration <= 0) return 1;
  // Weight is the duration divided by standard class duration, rounded to the nearest integer.
  // We ensure it is at least 1 class slot.
  return Math.max(1, Math.round(duration / standardDuration));
}
