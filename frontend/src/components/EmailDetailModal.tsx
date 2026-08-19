import { useState } from 'react';
import { Email } from '../types';
import { StatusBadge } from './UIComponents';
import { formatDate } from '../utils';

interface EmailDetailModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (email: Email) => void;
}

export default function EmailDetailModal({ email, isOpen, onClose, onRetry }: EmailDetailModalProps) {
  const [retrying, setRetrying] = useState(false);

  if (!isOpen || !email) return null;

  const handleRetry = async () => {
    if (!onRetry || !email) return;
    setRetrying(true);
    await onRetry(email);
    setRetrying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Email Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Status</span>
            <StatusBadge status={email.status} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Recipient</span>
            <span className="text-white text-sm font-medium">{email.recipient}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Subject</span>
            <span className="text-white text-sm">{email.subject}</span>
          </div>

          {email.sender && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Sender</span>
              <span className="text-white text-sm">{email.sender.email}</span>
            </div>
          )}

          <div className="border-t border-gray-700 pt-4">
            <span className="text-gray-400 text-sm block mb-2">Body</span>
            <div className="bg-gray-900 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {email.body}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Created</span>
              <span className="text-gray-300 text-sm">{formatDate(email.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Scheduled For</span>
              <span className="text-gray-300 text-sm">{formatDate(email.scheduledAt)}</span>
            </div>
            {email.sentAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Sent At</span>
                <span className="text-green-400 text-sm">{formatDate(email.sentAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Attempts</span>
              <span className="text-gray-300 text-sm">{email.attempts}</span>
            </div>
            {email.jobId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Job ID</span>
                <span className="text-gray-300 text-xs font-mono truncate max-w-[300px]">{email.jobId}</span>
              </div>
            )}
          </div>

          {email.error && (
            <div className="border-t border-gray-700 pt-4">
              <span className="text-red-400 text-sm block mb-2">Error</span>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-300">
                {email.error}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
          {email.status === 'FAILED' && onRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-5 py-2.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {retrying && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>}
              {retrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
