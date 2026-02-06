// Get today's date string in YYYY-MM-DD format
export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Calculate puzzle number (days since launch)
export function getPuzzleNumber(dateString: string): number {
  const launchDate = new Date('2026-02-05');
  const currentDate = new Date(dateString);
  const diffTime = currentDate.getTime() - launchDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}
