import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { EmailJobData } from '../types';

const QUEUE_NAME = 'emailQueue';

let _queue: Queue | null = null;

export function getEmailQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _queue;
}

export async function addEmailJob(
  data: EmailJobData,
  delayMs: number
): Promise<string> {
  const queue = getEmailQueue();
  const job = await queue.add('send-email', data, {
    delay: delayMs,
    jobId: `email-${data.emailId}`,
  });
  return job.id!;
}

export async function removeEmailJob(jobId: string): Promise<void> {
  const queue = getEmailQueue();
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}

export { QUEUE_NAME };
