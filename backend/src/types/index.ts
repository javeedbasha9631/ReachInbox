export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UserPayload {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderName?: string;
}

export interface EmailJobData {
  emailId: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  delayMs: number;
  senderName: string;
}

export interface EmailRecord {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  sentAt: Date | null;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  jobId: string;
  attempts: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    email: string;
  };
}

declare global {
  namespace Express {
    interface User extends UserPayload {}
  }
}
