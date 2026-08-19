export function parseCsvOrText(content: string): string[] {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const lines = content.split(/[\n\r]+/);

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const candidates: string[] = [];

    if (emailRegex.test(trimmed)) {
      candidates.push(trimmed);
    } else if (trimmed.includes(',')) {
      for (const part of trimmed.split(',')) {
        const cleaned = part.trim().replace(/^["']|["']$/g, '');
        if (emailRegex.test(cleaned)) {
          candidates.push(cleaned);
        }
      }
    }

    for (const email of candidates) {
      const key = email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        emails.push(email);
      }
    }
  }

  return emails;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'SCHEDULED':
      return 'text-blue-400 bg-blue-400/10';
    case 'PROCESSING':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'SENT':
      return 'text-green-400 bg-green-400/10';
    case 'FAILED':
      return 'text-red-400 bg-red-400/10';
    default:
      return 'text-gray-400 bg-gray-400/10';
  }
}
