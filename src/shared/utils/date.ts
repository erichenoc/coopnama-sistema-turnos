/**
 * Get today's date as YYYY-MM-DD string in local timezone.
 *
 * IMPORTANT: Do NOT use `new Date().toISOString().split('T')[0]` for local dates.
 * toISOString() converts to UTC, which shifts the date forward after 8 PM
 * in Dominican Republic (UTC-4), causing queries to use tomorrow's date.
 */
export function getLocalDateString(date?: Date): string {
  const d = date ?? new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
