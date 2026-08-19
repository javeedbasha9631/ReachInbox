import { StatusBadge } from './UIComponents';
import { formatDate } from '../utils';
import { Email } from '../types';

interface EmailTableProps {
  emails: Email[];
  showSentTime?: boolean;
  showAllColumns?: boolean;
  onRowClick?: (email: Email) => void;
  onRetry?: (email: Email) => void;
  retrying?: string | null;
}

export default function EmailTable({ emails, showSentTime = false, showAllColumns = false, onRowClick, onRetry, retrying }: EmailTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Recipient</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</th>
            {showAllColumns && (
              <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
            )}
            <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {showAllColumns ? 'Scheduled' : showSentTime ? 'Sent Time' : 'Scheduled Time'}
            </th>
            {showAllColumns && (
              <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Sent</th>
            )}
            <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            {showAllColumns && (
              <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Attempts</th>
            )}
            {onRetry && (
              <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
            )}
            {showSentTime && !showAllColumns && (
              <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Preview</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {emails.map((email) => (
            <tr
              key={email.id}
              className={`hover:bg-gray-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(email)}
            >
              <td className="px-6 py-4 text-sm text-gray-200">{email.recipient}</td>
              <td className="px-6 py-4 text-sm text-gray-200 max-w-[200px] truncate">{email.subject}</td>
              {showAllColumns && (
                <td className="px-6 py-4 text-sm text-gray-400">{formatDate(email.createdAt)}</td>
              )}
              <td className="px-6 py-4 text-sm text-gray-400">
                {formatDate(showSentTime && email.sentAt ? email.sentAt : email.scheduledAt)}
              </td>
              {showAllColumns && (
                <td className="px-6 py-4 text-sm text-gray-400">
                  {email.sentAt ? formatDate(email.sentAt) : '-'}
                </td>
              )}
              <td className="px-6 py-4">
                <StatusBadge status={email.status} />
              </td>
              {showAllColumns && (
                <td className="px-6 py-4 text-sm text-gray-400">{email.attempts}</td>
              )}
              {onRetry && (
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  {email.status === 'FAILED' ? (
                    <button
                      onClick={() => onRetry(email)}
                      disabled={retrying === email.id}
                      className="px-3 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded-md hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                    >
                      {retrying === email.id ? 'Retrying...' : 'Retry'}
                    </button>
                  ) : (
                    <span className="text-gray-600 text-xs">-</span>
                  )}
                </td>
              )}
              {showSentTime && !showAllColumns && (
                <td className="px-6 py-4">
                  {email.previewUrl ? (
                    <a
                      href={email.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Email
                    </a>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
