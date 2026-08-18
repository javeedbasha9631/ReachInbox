export interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar?: string;
}

export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface Sender {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  createdAt: string;
}

export interface Email {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  jobId: string;
  attempts: number;
  error: string | null;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    email: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderName: string;
}

export interface ScheduleEmailResponse {
  emails: Email[];
  totalScheduled: number;
}
