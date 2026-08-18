import { useState } from 'react';
import toast from 'react-hot-toast';
import ComposeEmailModal from '../components/ComposeEmailModal';
import EmailDetailModal from '../components/EmailDetailModal';
import { useScheduledEmails, useSentEmails, useEmailHistory } from '../hooks/useEmails';
import EmailTable from '../components/EmailTable';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/UIComponents';
import { useAuth } from '../hooks/useAuth';
import { Email } from '../types';
import { emailApi } from '../services/api';

type Tab = 'scheduled' | 'sent' | 'history';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailEmail, setDetailEmail] = useState<Email | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const scheduled = useScheduledEmails();
  const sent = useSentEmails();
  const history = useEmailHistory();

  const handleRefresh = () => {
    if (activeTab === 'scheduled') scheduled.refresh();
    else if (activeTab === 'sent') sent.refresh();
    else history.refresh();
  };

  const activeData = activeTab === 'scheduled' ? scheduled : activeTab === 'sent' ? sent : { emails: history.emails, loading: history.loading, error: history.error };

  const handleRowClick = (email: Email) => {
    setDetailEmail(email);
    setDetailOpen(true);
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all sent/failed emails from history?')) return;
    try {
      const res = await emailApi.clearHistory();
      if (res.success) {
        toast.success(res.message || 'History cleared');
        history.refresh();
      } else {
        toast.error(res.error || 'Failed to clear history');
      }
    } catch {
      toast.error('Failed to clear history');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'scheduled' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sent' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            History
          </button>
        </div>

        <button
          onClick={() => setComposeOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Compose
        </button>
      </div>

      {activeTab === 'history' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total" value={history.stats.total} color="text-white" />
          <StatCard label="Scheduled" value={history.stats.scheduled} color="text-blue-400" />
          <StatCard label="Processing" value={history.stats.processing} color="text-yellow-400" />
          <StatCard label="Sent" value={history.stats.sent} color="text-green-400" />
          <StatCard label="Failed" value={history.stats.failed} color="text-red-400" />
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">
            {activeTab === 'scheduled' && `${scheduled.emails.length} scheduled email(s)`}
            {activeTab === 'sent' && `${sent.emails.length} sent email(s)`}
            {activeTab === 'history' && `${history.emails.length} total email(s)`}
          </h3>
          <div className="flex items-center gap-3">
            {activeTab === 'history' && history.emails.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear History
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

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
          <EmailTable
            emails={activeData.emails}
            showSentTime={activeTab === 'sent'}
            showAllColumns={activeTab === 'history'}
            onRowClick={activeTab === 'history' ? handleRowClick : undefined}
          />
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

      <EmailDetailModal
        email={detailEmail}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailEmail(null);
        }}
      />
    </div>
  );
}
