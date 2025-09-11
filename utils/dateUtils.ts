// Unified date utilities for consistent date handling across the app
export class DateUtils {
  /**
   * Format date to YYYY-MM-DD string format consistently
   */
  static formatToDateString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  }

  /**
   * Format date for display in user's locale
   */
  static formatForDisplay(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  /**
   * Format date for short display (e.g., "Mon", "Tue")
   */
  static formatShort(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(undefined, { weekday: 'short' });
  }

  /**
   * Get today's date as YYYY-MM-DD string
   */
  static getTodayString(): string {
    return this.formatToDateString(new Date());
  }

  /**
   * Get date N days ago as YYYY-MM-DD string
   */
  static getDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.formatToDateString(date);
  }

  /**
   * Get date N days from today as YYYY-MM-DD string
   */
  static getDaysFromNow(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return this.formatToDateString(date);
  }

  /**
   * Convert Firebase timestamp to Date object safely
   */
  static fromFirebaseTimestamp(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  }

  /**
   * Convert Date to ISO string for consistent storage
   */
  static toStorageString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString();
  }

  /**
   * Parse stored date string back to Date object
   */
  static fromStorageString(dateString: string | null): Date | null {
    if (!dateString) return null;
    return new Date(dateString);
  }

  /**
   * Check if two dates are the same day
   */
  static isSameDay(date1: Date | string, date2: Date | string): boolean {
    return this.formatToDateString(date1) === this.formatToDateString(date2);
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    return this.isSameDay(date, new Date());
  }

  /**
   * Get last N days as an array of date strings
   */
  static getLastNDays(n: number): string[] {
    return Array.from({ length: n }, (_, i) => this.getDaysAgo(i));
  }

  /**
   * Calculate days between two dates
   */
  static daysBetween(date1: Date | string, date2: Date | string): number {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// Legacy compatibility - for gradual migration
export const formatDateToYYYYMMDD = (date: Date): string => DateUtils.formatToDateString(date);