/**
 * Safe, robust API error parsing utility
 * Prevents HTML leakages, exposes safe validation errors, and maps status codes.
 */
export function getApiErrorMessage(
  err: any,
  fallbackMessage: string = 'An unexpected error occurred. Please try again.'
): string {
  if (!err) return fallbackMessage;

  // Plain string error
  if (typeof err === 'string') {
    return sanitizeErrorMessage(err, fallbackMessage);
  }

  // Network / Connection errors
  if (
    err.code === 'ERR_NETWORK' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.message === 'Network Error' ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('failed to fetch'))
  ) {
    return 'Unable to connect to the server. Check your connection.';
  }

  const response = err.response;
  if (!response) {
    if (typeof err.message === 'string' && err.message.trim() !== '') {
      return sanitizeErrorMessage(err.message, fallbackMessage);
    }
    return fallbackMessage;
  }

  const status = response.status;

  // Authentication & Authorization mapping
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    const raw = extractMessageFromData(response.data);
    if (raw && !isInternalServerSnippet(raw)) {
      return sanitizeErrorMessage(raw, 'You do not have permission to perform this action.');
    }
    return 'You do not have permission to perform this action.';
  }
  if (status === 404) {
    const raw = extractMessageFromData(response.data);
    if (raw && !isInternalServerSnippet(raw)) {
      return sanitizeErrorMessage(raw, 'The requested address or resource was not found.');
    }
    return 'The requested address or resource was not found.';
  }

  // Server error response parsing
  const rawMsg = extractMessageFromData(response.data);
  if (rawMsg) {
    return sanitizeErrorMessage(rawMsg, fallbackMessage);
  }

  if (status >= 500) {
    return 'The server encountered an error processing your request. Please try again.';
  }

  return fallbackMessage;
}

function extractMessageFromData(data: any): string | null {
  if (!data) return null;

  // If HTML document string leaked
  if (typeof data === 'string') {
    if (data.includes('<!DOCTYPE') || data.includes('<html') || data.includes('Cannot ')) {
      return null;
    }
    return data;
  }

  if (typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim() !== '') {
      return data.message;
    }
    if (typeof data.error === 'string' && data.error.trim() !== '') {
      return data.error;
    }
    // Validation errors array
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      if (typeof first === 'string') return first;
      if (typeof first?.message === 'string') return first.message;
      if (typeof first?.msg === 'string') return first.msg;
    }
    // Validation errors object
    if (typeof data.errors === 'object') {
      const vals = Object.values(data.errors);
      if (vals.length > 0) {
        const first = vals[0];
        if (typeof first === 'string') return first;
        if (typeof first === 'object' && (first as any)?.message) return (first as any).message;
      }
    }
  }

  return null;
}

function isInternalServerSnippet(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('<!doctype') ||
    lower.includes('<html') ||
    lower.includes('prisma') ||
    lower.includes('select ') ||
    lower.includes('insert into') ||
    lower.includes('syntax error') ||
    lower.includes('violates foreign key') ||
    lower.includes('stack trace') ||
    lower.includes('jwt expired') ||
    lower.includes('cannot put') ||
    lower.includes('cannot post') ||
    lower.includes('cannot get')
  );
}

function sanitizeErrorMessage(msg: string, fallback: string): string {
  const trimmed = msg.trim();
  if (!trimmed || isInternalServerSnippet(trimmed)) {
    return fallback;
  }
  // Trim excessive length
  if (trimmed.length > 250) {
    return trimmed.slice(0, 247) + '...';
  }
  return trimmed;
}
