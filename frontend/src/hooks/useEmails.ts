import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Email } from '../types';
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
