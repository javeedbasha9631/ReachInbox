import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ComposeEmailModal from '../components/ComposeEmailModal';
import { useScheduledEmails, useSentEmails } from '../hooks/useEmails';
import EmailTable from '../components/EmailTable';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/UIComponents';
import { useAuth } from '../hooks/useAuth';

type Tab = 'scheduled' | 'sent';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const scheduled = useScheduledEmails();
  const sent = useSentEmails();

  const activeData = activeTab === 'scheduled' ? scheduled : sent;

  const handleRefresh = () => {
    if (activeTab === 'scheduled') {
      scheduled.refresh();
    } else {
      sent.refresh();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Scheduled Emails
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sent Emails
          </button>
        </div>

        <button
          onClick={() => setComposeOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Compose New Email
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {activeTab === 'scheduled' && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-400">
              {scheduled.emails.length} scheduled email(s)
            </h3>
            <button
              onClick={scheduled.refresh}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}

        {activeData.loading ? (
          <LoadingSpinner />
        ) : activeData.error ? (
          <ErrorState message={activeData.error} onRetry={handleRefresh} />
        ) : activeData.emails.length === 0 ? (
          <EmptyState
            message={`No ${activeTab} emails yet`}
            actionLabel={activeTab === 'scheduled' ? 'Schedule your first email' : undefined}
            onAction={activeTab === 'scheduled' ? () => setComposeOpen(true) : undefined}
          />
        ) : (
          <EmailTable emails={activeData.emails} showSentTime={activeTab === 'sent'} />
        )}
      </div>

      <ComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={() => {
          scheduled.refresh();
          toast.success('Refreshed scheduled emails');
        }}
        defaultSenderName={user?.name || ''}
      />
    </div>
  );
}
