// lib/weeklyUtils.js - Week Calculation Utilities
export function getWeekBoundaries(weekOffset = 0) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days since last Sunday
  const daysSinceLastSunday = currentDay;
  
  // Get the start of the target week (Sunday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceLastSunday - (weekOffset * 7));
  weekStart.setHours(0, 0, 0, 0);
  
  // Get the end of the target week (Saturday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return {
    start: weekStart.toISOString().split('T')[0], // YYYY-MM-DD format for Notion
    end: weekEnd.toISOString().split('T')[0],
    startDate: weekStart,
    endDate: weekEnd
  };
}

export function formatWeekRange(weekOffset = 0) {
  const { startDate, endDate } = getWeekBoundaries(weekOffset);
  
  const startFormatted = startDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  const endFormatted = endDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  
  const year = endDate.getFullYear();
  
  return `${startFormatted} - ${endFormatted}, ${year}`;
}

export function getWeekLabel(weekOffset = 0) {
  switch (weekOffset) {
    case 0:
      return 'This Week';
    case 1:
      return 'Previous Week';
    case 2:
      return 'Previous 2 Weeks';
    default:
      return `${weekOffset} Weeks Ago`;
  }
}

// Example usage:
// getWeekBoundaries(0) = This week (Sunday to Saturday)
// getWeekBoundaries(1) = Previous week  
// getWeekBoundaries(2) = Previous 2 weeks
// formatWeekRange(0) = "Jan 7 - Jan 13, 2025"
