import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Email, EmailHistoryStats } from '../types';
import { emailApi } from '../services/api';

const POLL_INTERVAL_MS = 10000;

export function useScheduledEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEmails = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await emailApi.getScheduled();
      if (response.success && response.data) {
        setEmails(response.data as Email[]);
      } else {
        setError(response.error || 'Failed to fetch emails');
      }
    } catch (err) {
      if (!silent) {
        setError('Failed to fetch scheduled emails');
        toast.error('Failed to load scheduled emails');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    intervalRef.current = setInterval(() => fetchEmails(true), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEmails]);

  return { emails, loading, error, refresh: fetchEmails };
}

export function useSentEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEmails = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await emailApi.getSent();
      if (response.success && response.data) {
        setEmails(response.data as Email[]);
      } else {
        setError(response.error || 'Failed to fetch emails');
      }
    } catch (err) {
      if (!silent) {
        setError('Failed to fetch sent emails');
        toast.error('Failed to load sent emails');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    intervalRef.current = setInterval(() => fetchEmails(true), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEmails]);

  return { emails, loading, error, refresh: fetchEmails };
}

export function useEmailHistory() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<EmailHistoryStats>({ total: 0, scheduled: 0, processing: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEmails = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await emailApi.getHistory();
      if (response.success && response.data) {
        setEmails(response.data.emails as Email[]);
        setStats(response.data.stats);
      } else {
        setError(response.error || 'Failed to fetch history');
      }
    } catch {
      if (!silent) {
        setError('Failed to fetch email history');
        toast.error('Failed to load email history');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    intervalRef.current = setInterval(() => fetchEmails(true), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEmails]);

  return { emails, stats, loading, error, refresh: fetchEmails };
}
