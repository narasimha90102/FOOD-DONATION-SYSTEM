/**
 * Formats a Date object or ISO string into Indian Standard Time (IST) format:
 * DD Month YYYY, hh:mm AM/PM (IST)
 * Example: 23 August 2026, 10:49 PM (IST)
 */
export function formatISTDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return 'Not specified';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Not specified';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    parts.forEach((p) => {
      partMap[p.type] = p.value;
    });

    const day = partMap.day;
    const month = partMap.month;
    const year = partMap.year;
    const hour = partMap.hour;
    const minute = partMap.minute;
    const dayPeriod = partMap.dayPeriod ? partMap.dayPeriod.toUpperCase() : '';

    return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} (IST)`;
  } catch (err) {
    return date.toLocaleString();
  }
}

/**
 * Standard alias for formatISTDateTime
 */
export function formatDateTime(dateInput: string | Date | undefined | null): string {
  return formatISTDateTime(dateInput);
}

/**
 * Formats a Date object or ISO string into DD Month YYYY format in Asia/Kolkata timezone.
 * Example: 23 August 2026
 */
export function formatDateOnly(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return 'Not specified';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Not specified';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    parts.forEach((p) => {
      partMap[p.type] = p.value;
    });

    return `${partMap.day} ${partMap.month} ${partMap.year}`;
  } catch (err) {
    return date.toLocaleDateString();
  }
}
