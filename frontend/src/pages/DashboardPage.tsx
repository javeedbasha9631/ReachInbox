import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ComposeEmailModal from '../components/ComposeEmailModal';
import EmailDetailModal from '../components/EmailDetailModal';
import { useScheduledEmails, useSentEmails, useEmailHistory } from '../hooks/useEmails';
import EmailTable from '../components/EmailTable';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/UIComponents';
import { useAuth } from '../hooks/useAuth';
import { Email } from '../types';
import { emailApi, authApi } from '../services/api';

type Tab = 'scheduled' | 'sent' | 'history';
type StatusFilter = 'all' | 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

function StatCard({ label, value, color, active, onClick }: { label: string; value: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`bg-gray-800 rounded-xl border p-5 text-left transition-all hover:border-gray-500 ${
        active ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-gray-700'
      }`}
    >
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </button>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('scheduled');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailEmail, setDetailEmail] = useState<Email | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const scheduled = useScheduledEmails();
  const sent = useSentEmails();
  const history = useEmailHistory();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailGrant = params.get('gmail_grant');
    if (gmailGrant === 'success') {
      toast.success('Gmail connected successfully');
      setGmailConnected(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gmailGrant === 'failed') {
      toast.error('Gmail connection failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    authApi.gmailStatus().then((res) => {
      if (res.success && res.data) {
        setGmailConnected(res.data.connected);
      }
    }).catch(() => {});
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setStatusFilter('all');
  };

  const handleRefresh = () => {
    if (activeTab === 'scheduled') scheduled.refresh();
    else if (activeTab === 'sent') sent.refresh();
    history.refresh();
  };

  const handleStatCardClick = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setActiveTab('history');
  };

  const filteredHistoryEmails = history.emails.filter(
    (e) => statusFilter === 'all' || e.status === statusFilter
  );

  const activeData = activeTab === 'scheduled'
    ? scheduled
    : activeTab === 'sent'
      ? sent
      : { emails: filteredHistoryEmails, loading: history.loading, error: history.error };

  const handleRowClick = (email: Email) => {
    setDetailEmail(email);
    setDetailOpen(true);
  };

  const handleRetry = async (email: Email) => {
    setRetrying(email.id);
    try {
      const res = await emailApi.retry(email.id);
      if (res.success) {
        toast.success('Email resent successfully');
        history.refresh();
        sent.refresh();
        scheduled.refresh();
      } else {
        toast.error(res.error || 'Retry failed');
        history.refresh();
      }
    } catch {
      toast.error('Retry failed');
    } finally {
      setRetrying(null);
    }
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

  const hasFailedEmails = activeData.emails.some((e) => e.status === 'FAILED');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => handleTabChange('scheduled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'scheduled' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => handleTabChange('sent')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sent' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => handleTabChange('history')}
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

      {gmailConnected === false && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-300 text-sm">Gmail not connected. Emails will fail to send.</span>
          </div>
          <a
            href={authApi.getGrantGmailUrl()}
            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-medium rounded-lg transition-colors border border-yellow-500/30"
          >
            Connect Gmail
          </a>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total" value={history.stats.total} color="text-white" active={activeTab === 'history' && statusFilter === 'all'} onClick={() => handleStatCardClick('all')} />
        <StatCard label="Scheduled" value={history.stats.scheduled} color="text-blue-400" active={activeTab === 'history' && statusFilter === 'SCHEDULED'} onClick={() => handleStatCardClick('SCHEDULED')} />
        <StatCard label="Processing" value={history.stats.processing} color="text-yellow-400" active={activeTab === 'history' && statusFilter === 'PROCESSING'} onClick={() => handleStatCardClick('PROCESSING')} />
        <StatCard label="Sent" value={history.stats.sent} color="text-green-400" active={activeTab === 'history' && statusFilter === 'SENT'} onClick={() => handleStatCardClick('SENT')} />
        <StatCard label="Failed" value={history.stats.failed} color="text-red-400" active={activeTab === 'history' && statusFilter === 'FAILED'} onClick={() => handleStatCardClick('FAILED')} />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">
            {activeTab === 'scheduled' && `${scheduled.emails.length} scheduled email(s)`}
            {activeTab === 'sent' && `${sent.emails.length} sent email(s)`}
            {activeTab === 'history' && `${filteredHistoryEmails.length} email(s)`}
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
            message={activeTab === 'history' && statusFilter !== 'all'
              ? `No emails found`
              : `No ${activeTab} emails yet`}
            actionLabel={activeTab === 'scheduled' ? 'Schedule your first email' : undefined}
            onAction={activeTab === 'scheduled' ? () => setComposeOpen(true) : undefined}
          />
        ) : (
          <EmailTable
            emails={activeData.emails}
            showSentTime={activeTab === 'sent'}
            showAllColumns={activeTab === 'history'}
            onRowClick={activeTab === 'history' ? handleRowClick : undefined}
            onRetry={hasFailedEmails ? handleRetry : undefined}
            retrying={retrying}
          />
        )}
      </div>

      <ComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={() => {
          scheduled.refresh();
          history.refresh();
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
        onRetry={handleRetry}
      />
    </div>
  );
}
