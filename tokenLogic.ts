export type TokenStatus = 'waiting' | 'arrived' | 'serving' | 'completed' | 'cancelled';

export interface QueueToken {
  id: string;
  tokenNumber: string;
  customerName: string;
  customerPhone?: string;
  serviceCenter: string;
  department: string;
  counterId?: string;
  bookingTime: string;
  status: TokenStatus;
  qrPayload: string;
  arrivedAt?: string;
  servingAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface ParseResult {
  isValid: boolean;
  tokenNumber?: string;
  raw: string;
  error?: string;
}

export type TokenVerificationCategory =
  | 'valid_waiting'
  | 'valid_arrived'
  | 'already_serving'
  | 'completed'
  | 'cancelled'
  | 'not_found'
  | 'malformed';

export interface VerificationResult {
  success: boolean;
  category: TokenVerificationCategory;
  message: string;
  token?: QueueToken;
  position?: number;
  peopleAhead?: number;
  estWaitMinutes?: number;
}

/**
 * Standard QR code payload generator
 */
export function generateQrPayload(tokenNumber: string): string {
  const cleanNumber = tokenNumber.trim().toUpperCase();
  return `QUEUELESS:TOKEN:${cleanNumber}`;
}

/**
 * Parses and validates raw scanned QR content or manual input string
 */
export function parseQrPayload(raw: string): ParseResult {
  if (!raw || typeof raw !== 'string') {
    return {
      isValid: false,
      raw: '',
      error: 'Empty or invalid QR code format.',
    };
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      raw: trimmed,
      error: 'Empty QR code detected.',
    };
  }

  // 1. Matches QUEUELESS:TOKEN:<TOKEN_ID>
  const prefixMatch = trimmed.match(/^QUEUELESS:TOKEN:([A-Za-z0-9\-_]+)$/i);
  if (prefixMatch) {
    return {
      isValid: true,
      tokenNumber: prefixMatch[1].toUpperCase(),
      raw: trimmed,
    };
  }

  // 2. Matches URL query params e.g. https://.../?token=A024 or /verify?token=A024
  if (trimmed.includes('token=')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.local/${trimmed.replace(/^\/+/, '')}`);
      const tokenParam = url.searchParams.get('token');
      if (tokenParam && /^[A-Za-z0-9\-_]+$/.test(tokenParam)) {
        return {
          isValid: true,
          tokenNumber: tokenParam.toUpperCase(),
          raw: trimmed,
        };
      }
    } catch {
      // Fall through if URL parsing fails
    }
  }

  // 3. Matches JSON payload { "type": "queueless", "token": "A024" }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.token === 'string' && /^[A-Za-z0-9\-_]+$/.test(parsed.token)) {
        return {
          isValid: true,
          tokenNumber: parsed.token.toUpperCase(),
          raw: trimmed,
        };
      }
    } catch {
      // Fall through
    }
  }

  // 4. Plain token number fallback (e.g. A024, B102, T-99)
  const tokenRegex = /^[A-Za-z][0-9]{2,4}$|^[A-Za-z0-9\-_]{3,8}$/;
  if (tokenRegex.test(trimmed)) {
    return {
      isValid: true,
      tokenNumber: trimmed.toUpperCase(),
      raw: trimmed,
    };
  }

  // If none matched, mark as malformed/unrecognized
  return {
    isValid: false,
    raw: trimmed,
    error: 'Invalid or malformed QR code. Payload is not a recognized QueueLess token identifier.',
  };
}

/**
 * Calculates current queue position, number of people ahead, and estimated wait
 */
export function calculateQueueMetrics(
  tokens: QueueToken[],
  targetTokenNumber: string,
  avgMinsPerPerson: number = 7
): { position: number; peopleAhead: number; estWaitMinutes: number } {
  const normalizedTarget = targetTokenNumber.trim().toUpperCase();
  const targetToken = tokens.find((t) => t.tokenNumber.toUpperCase() === normalizedTarget);

  if (!targetToken) {
    return { position: 0, peopleAhead: 0, estWaitMinutes: 0 };
  }

  // Filter department queue
  const departmentTokens = tokens.filter(
    (t) => t.department === targetToken.department && (t.status === 'waiting' || t.status === 'arrived')
  );

  const targetIndex = departmentTokens.findIndex((t) => t.tokenNumber.toUpperCase() === normalizedTarget);

  if (targetIndex === -1) {
    // Already serving or completed
    return { position: 0, peopleAhead: 0, estWaitMinutes: 0 };
  }

  const peopleAhead = targetIndex;
  const position = targetIndex + 1;
  const estWaitMinutes = peopleAhead * avgMinsPerPerson;

  return { position, peopleAhead, estWaitMinutes };
}

/**
 * Verifies a token against the current list of tokens
 */
export function verifyTokenInStore(
  tokens: QueueToken[],
  rawInput: string,
  avgMinsPerPerson: number = 7
): VerificationResult {
  const parseResult = parseQrPayload(rawInput);

  if (!parseResult.isValid || !parseResult.tokenNumber) {
    return {
      success: false,
      category: 'malformed',
      message: parseResult.error || 'Invalid or malformed QR code format.',
    };
  }

  const tokenNumber = parseResult.tokenNumber;
  const token = tokens.find((t) => t.tokenNumber.toUpperCase() === tokenNumber);

  if (!token) {
    return {
      success: false,
      category: 'not_found',
      message: `Token "${tokenNumber}" not found. Please scan a valid QueueLess token.`,
    };
  }

  const metrics = calculateQueueMetrics(tokens, tokenNumber, avgMinsPerPerson);

  switch (token.status) {
    case 'waiting':
      return {
        success: true,
        category: 'valid_waiting',
        message: 'Valid Token - Customer is waiting for check-in.',
        token,
        ...metrics,
      };
    case 'arrived':
      return {
        success: true,
        category: 'valid_arrived',
        message: 'Valid Token - Customer arrived & checked in. Ready for counter call.',
        token,
        ...metrics,
      };
    case 'serving':
      return {
        success: true,
        category: 'already_serving',
        message: `Customer is currently being served at ${token.counterId || 'the active counter'}.`,
        token,
        ...metrics,
      };
    case 'completed':
      return {
        success: false,
        category: 'completed',
        message: 'Token has already been completed. Service was finalized.',
        token,
        ...metrics,
      };
    case 'cancelled':
      return {
        success: false,
        category: 'cancelled',
        message: 'Token is cancelled and cannot be checked in as an active customer.',
        token,
        ...metrics,
      };
    default:
      return {
        success: false,
        category: 'not_found',
        message: 'Unknown token status encountered.',
        token,
      };
  }
}

/**
 * Validates whether a state transition is legal
 */
export function validateStatusTransition(
  currentStatus: TokenStatus,
  action: 'mark_arrived' | 'mark_serving' | 'mark_completed' | 'cancel'
): { allowed: boolean; newStatus?: TokenStatus; reason?: string } {
  if (currentStatus === 'completed') {
    return {
      allowed: false,
      reason: 'Token is already completed and cannot be modified.',
    };
  }

  if (currentStatus === 'cancelled') {
    return {
      allowed: false,
      reason: 'Token is cancelled and cannot be reactivated.',
    };
  }

  switch (action) {
    case 'mark_arrived':
      if (currentStatus === 'waiting') {
        return { allowed: true, newStatus: 'arrived' };
      }
      if (currentStatus === 'arrived') {
        return { allowed: false, reason: 'Customer is already marked as arrived.' };
      }
      return { allowed: false, reason: `Cannot mark as arrived from "${currentStatus}" status.` };

    case 'mark_serving':
      if (currentStatus === 'waiting' || currentStatus === 'arrived') {
        return { allowed: true, newStatus: 'serving' };
      }
      if (currentStatus === 'serving') {
        return { allowed: false, reason: 'Customer is already being served.' };
      }
      return { allowed: false, reason: `Cannot start serving from "${currentStatus}" status.` };

    case 'mark_completed':
      if (currentStatus === 'serving' || currentStatus === 'arrived') {
        return { allowed: true, newStatus: 'completed' };
      }
      return { allowed: false, reason: 'Only actively serving or arrived tokens can be completed.' };

    case 'cancel':
      return { allowed: true, newStatus: 'cancelled' };

    default:
      return { allowed: false, reason: 'Unknown action.' };
  }
}
