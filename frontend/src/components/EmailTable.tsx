import { StatusBadge } from './UIComponents';
import { formatDate } from '../utils';
import { Email } from '../types';

interface EmailTableProps {
  emails: Email[];
  showSentTime?: boolean;
}

export default function EmailTable({ emails, showSentTime = false }: EmailTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {showSentTime ? 'Sent Time' : 'Scheduled Time'}
            </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            {showSentTime && (
              <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Preview</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-200">{email.recipient}</td>
              <td className="px-6 py-4 text-sm text-gray-200">{email.subject}</td>
              <td className="px-6 py-4 text-sm text-gray-400">
                {formatDate(showSentTime ? (email.sentAt || email.updatedAt) : email.scheduledAt)}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={email.status} />
              </td>
              {showSentTime && (
                <td className="px-6 py-4">
                  {email.previewUrl ? (
                    <a
                      href={email.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
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
