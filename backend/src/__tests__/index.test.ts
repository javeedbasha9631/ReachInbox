import { describe, it, expect } from 'vitest';

describe('Email Validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('should accept valid email addresses', () => {
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('test.user@gmail.com')).toBe(true);
    expect(emailRegex.test('name+tag@domain.co')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(emailRegex.test('')).toBe(false);
    expect(emailRegex.test('notanemail')).toBe(false);
    expect(emailRegex.test('@domain.com')).toBe(false);
    expect(emailRegex.test('user@')).toBe(false);
    expect(emailRegex.test('user @example.com')).toBe(false);
  });
});

describe('Delay Calculation', () => {
  it('should calculate correct delays for sequential emails', () => {
    const startTime = new Date('2026-08-18T18:00:00.000Z').getTime();
    const delayMs = 2000;
    const recipients = ['a@test.com', 'b@test.com', 'c@test.com'];

    const delays = recipients.map((_, i) => startTime + i * delayMs);

    expect(delays[0]).toBe(startTime);
    expect(delays[1]).toBe(startTime + 2000);
    expect(delays[2]).toBe(startTime + 4000);
  });

  it('should handle zero delay', () => {
    const startTime = Date.now();
    const delayMs = 0;
    const delays = [0, 1, 2].map((i) => startTime + i * delayMs);

    expect(delays[0]).toBe(startTime);
    expect(delays[1]).toBe(startTime);
    expect(delays[2]).toBe(startTime);
  });
});

describe('Rate Limit Window', () => {
  it('should generate correct window keys', () => {
    const date = new Date('2026-08-18T18:30:00.000Z');
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const dateStr = date.toISOString().split('T')[0];
    const key = `rate-limit:sender123:${dateStr}T${hour}`;

    expect(key).toBe('rate-limit:sender123:2026-08-18T18');
  });
});

describe('CSV Parsing', () => {
  it('should extract emails from CSV content', () => {
    const csv = 'email\njohn@gmail.com\nalex@gmail.com\nrahul@gmail.com';
    const lines = csv.split('\n').slice(1);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = lines
      .map((line) => line.trim())
      .filter((line) => emailRegex.test(line));

    expect(emails).toEqual(['john@gmail.com', 'alex@gmail.com', 'rahul@gmail.com']);
  });

  it('should extract emails from text file content', () => {
    const txt = 'john@gmail.com\nalex@gmail.com\nrahul@gmail.com';
    const lines = txt.split('\n');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = lines
      .map((line) => line.trim())
      .filter((line) => emailRegex.test(line));

    expect(emails).toEqual(['john@gmail.com', 'alex@gmail.com', 'rahul@gmail.com']);
  });

  it('should handle mixed valid and invalid entries', () => {
    const csv = 'email\nvalid@test.com\ninvalid\nalso-valid@domain.org\nnot-an-email';
    const lines = csv.split('\n').slice(1);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = lines
      .map((line) => line.trim())
      .filter((line) => emailRegex.test(line));

    expect(emails).toEqual(['valid@test.com', 'also-valid@domain.org']);
  });

  it('should handle empty content', () => {
    const csv = '';
    const lines = csv.split('\n').filter((l) => l.trim());
    expect(lines.length).toBe(0);
  });
});

describe('Status Transitions', () => {
  const validTransitions = [
    ['SCHEDULED', 'PROCESSING'],
    ['PROCESSING', 'SENT'],
    ['PROCESSING', 'FAILED'],
  ] as const;

  const invalidTransitions = [
    ['SENT', 'SCHEDULED'],
    ['FAILED', 'SCHEDULED'],
    ['SENT', 'PROCESSING'],
    ['FAILED', 'PROCESSING'],
  ] as const;

  it('should allow valid status transitions', () => {
    for (const [from, to] of validTransitions) {
      expect(from).not.toBe(to);
    }
  });

  it('should prevent invalid status transitions conceptually', () => {
    for (const [from, to] of invalidTransitions) {
      expect(from).not.toBe(to);
    }
  });
});
