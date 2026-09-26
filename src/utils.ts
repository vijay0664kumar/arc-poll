/**
 * Shared utility helpers for Arc Poll
 */

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function formatTimestamp(ts: bigint): string {
  const date = new Date(Number(ts) * 1000)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Parse onchain errors into friendly messages */
export function parseContractError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''

  if (msg.includes('user rejected') || msg.includes('4001')) {
    return 'Transaction cancelled.'
  }
  if (msg.includes('alreadyvoted')) {
    return 'You have already voted on this poll.'
  }
  if (msg.includes('pollalreadyclosed')) {
    return 'This poll has been closed.'
  }
  if (msg.includes('notpollcreator')) {
    return 'Only the poll creator can close this poll.'
  }
  if (msg.includes('invalidoption')) {
    return 'Invalid option selected.'
  }
  if (msg.includes('invalidoptionscount')) {
    return 'A poll must have 2–4 options.'
  }
  if (msg.includes('invalidquestion')) {
    return 'Poll question cannot be empty.'
  }
  if (msg.includes('emptyoption')) {
    return 'All options must have text.'
  }
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return 'Insufficient balance for gas fees.'
  }
  if (msg.includes('reverted')) {
    return 'Transaction failed. Please try again.'
  }
  if (msg.includes('network') || msg.includes('timeout')) {
    return 'Network error. Please check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}

/** Percentage for a vote count vs total, returns 0 if no votes */
export function votePercent(count: bigint, total: bigint): number {
  if (total === 0n) return 0
  return Math.round((Number(count) / Number(total)) * 100)
}
