/**
 * ArcPoll contract configuration
 * Deployed on Arc Testnet — 2026-09-26
 */

import artifact from '../contracts/out/ArcPoll.sol/ArcPoll.json'

export const ARC_POLL_ADDRESS = '0x2d6c6b59887047c91d02cc89258eba7456fc40df' as const

export const ARC_POLL_ABI = artifact.abi

export const ArcPollContract = {
  address: ARC_POLL_ADDRESS,
  abi: ARC_POLL_ABI,
} as const

export const ARC_TESTNET_CHAIN_ID = 5042002

// Mirrors the on-chain Poll struct
export interface PollData {
  id: bigint
  question: string
  options: string[]
  creator: `0x${string}`
  voteCounts: bigint[]
  totalVotes: bigint
  closed: boolean
  createdAt: bigint
}
