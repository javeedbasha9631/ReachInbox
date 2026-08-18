import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Email, EmailHistoryStats } from '../types';
import { emailApi } from '../services/api';

export function useScheduledEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await emailApi.getScheduled();
      if (response.success && response.data) {
        setEmails(response.data as Email[]);
      } else {
        setError(response.error || 'Failed to fetch emails');
      }
    } catch (err) {
      setError('Failed to fetch scheduled emails');
      toast.error('Failed to load scheduled emails');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return { emails, loading, error, refresh: fetchEmails };
}

export function useSentEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await emailApi.getSent();
      if (response.success && response.data) {
        setEmails(response.data as Email[]);
      } else {
        setError(response.error || 'Failed to fetch emails');
      }
    } catch (err) {
      setError('Failed to fetch sent emails');
      toast.error('Failed to load sent emails');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return { emails, loading, error, refresh: fetchEmails };
}

export function useEmailHistory() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<EmailHistoryStats>({ total: 0, scheduled: 0, processing: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await emailApi.getHistory();
      if (response.success && response.data) {
        setEmails(response.data.emails as Email[]);
        setStats(response.data.stats);
      } else {
        setError(response.error || 'Failed to fetch history');
      }
    } catch {
      setError('Failed to fetch email history');
      toast.error('Failed to load email history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return { emails, stats, loading, error, refresh: fetchEmails };
}
