import { useState, useEffect, useRef, useCallback } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi'
import { Lock, Loader2, ExternalLink, CheckCircle2, XCircle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ArcPollContract, ARC_TESTNET_CHAIN_ID, type PollData } from '../contract'
import { parseContractError, votePercent, formatAddress, formatTimestamp } from '../utils'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface PollCardProps {
  pollId: bigint
  onUpdate: () => void
}

const SKELETON_ROWS = Array.from({ length: 3 }, (_, i) => i)

export function PollCard({ pollId, onUpdate }: PollCardProps) {
  const { address, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [pendingOption, setPendingOption] = useState<bigint | null>(null)

  const isWrongChain = address != null && chainId !== ARC_TESTNET_CHAIN_ID

  // Read full poll data
  const { data: poll, refetch: refetchPoll } = useReadContract({
    ...ArcPollContract,
    functionName: 'getPoll',
    args: [pollId],
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  // Has current user voted?
  const { data: userVoted, refetch: refetchVoted } = useReadContract({
    ...ArcPollContract,
    functionName: 'hasVoted',
    args: [pollId, address ?? '0x0000000000000000000000000000000000000000'],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  // Which option did user pick?
  const { data: userChoice } = useReadContract({
    ...ArcPollContract,
    functionName: 'voterChoice',
    args: [pollId, address ?? '0x0000000000000000000000000000000000000000'],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address && userVoted === true },
  })

  // Vote write
  const {
    writeContract: voteWrite,
    data: voteHash,
    isPending: voteIsPending,
    reset: voteReset,
  } = useWriteContract()

  const { isLoading: voteConfirming, isSuccess: voteSuccess } = useWaitForTransactionReceipt({
    hash: voteHash,
  })

  // Close write
  const {
    writeContract: closeWrite,
    data: closeHash,
    isPending: closeIsPending,
    reset: closeReset,
  } = useWriteContract()

  const { isLoading: closeConfirming, isSuccess: closeSuccess } = useWaitForTransactionReceipt({
    hash: closeHash,
  })

  const refetchAll = useCallback(() => {
    void refetchPoll()
    void refetchVoted()
  }, [refetchPoll, refetchVoted])

  const isVoteBusy = voteIsPending || voteConfirming

  // Track whether we've handled vote/close success to prevent double-firing
  const voteHandledRef = useRef<`0x${string}` | null>(null)
  const closeHandledRef = useRef<`0x${string}` | null>(null)

  useEffect(() => {
    if (voteSuccess && voteHash && voteHandledRef.current !== voteHash) {
      voteHandledRef.current = voteHash
      const explorerUrl = buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, voteHash)
      toast.success('Vote recorded!', {
        action: explorerUrl
          ? { label: 'View tx', onClick: () => window.open(explorerUrl, '_blank') }
          : undefined,
      })
      setPendingOption(null)
      voteReset()
      refetchAll()
      onUpdate()
    }
  }, [voteSuccess, voteHash, voteReset, refetchAll, onUpdate])

  useEffect(() => {
    if (closeSuccess && closeHash && closeHandledRef.current !== closeHash) {
      closeHandledRef.current = closeHash
      const explorerUrl = buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, closeHash)
      toast.success('Poll closed.', {
        action: explorerUrl
          ? { label: 'View tx', onClick: () => window.open(explorerUrl, '_blank') }
          : undefined,
      })
      closeReset()
      refetchAll()
      onUpdate()
    }
  }, [closeSuccess, closeHash, closeReset, refetchAll, onUpdate])

  if (!poll) {
    return (
      <div
        className="animate-pulse rounded-3xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="mb-3 h-4 w-3/4 rounded-lg" style={{ background: 'var(--surface-muted)' }} />
        <div className="space-y-2">
          {SKELETON_ROWS.map((i) => (
            <div key={i} className="h-10 rounded-xl" style={{ background: 'var(--surface-muted)' }} />
          ))}
        </div>
      </div>
    )
  }

  const p = poll as unknown as PollData
  const isCreator = address?.toLowerCase() === p.creator.toLowerCase()
  const canVote = address && !p.closed && !userVoted && !isWrongChain
  const isCloseBusy = closeIsPending || closeConfirming

  const handleVote = (optionIndex: bigint) => {
    if (!address) return
    if (isWrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
      return
    }
    setPendingOption(optionIndex)
    voteWrite(
      {
        ...ArcPollContract,
        functionName: 'vote',
        args: [pollId, optionIndex],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        onError: (err) => {
          setPendingOption(null)
          toast.error(parseContractError(err))
        },
      }
    )
  }

  const handleClose = () => {
    if (!address || isWrongChain) return
    closeWrite(
      {
        ...ArcPollContract,
        functionName: 'closePoll',
        args: [pollId],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        onError: (err) => toast.error(parseContractError(err)),
      }
    )
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {p.closed ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(186,43,76,0.1)', color: 'var(--danger)' }}
              >
                <Lock className="size-3" /> Closed
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(26,128,71,0.1)', color: 'var(--success)' }}
              >
                <span className="inline-block size-1.5 rounded-full" style={{ background: 'var(--success)' }} />
                Active
              </span>
            )}
            <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
              Poll #{p.id.toString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
            <Users className="size-3.5" />
            <span className="tabular-nums">{p.totalVotes.toString()}</span>
            <span>{p.totalVotes === 1n ? 'vote' : 'votes'}</span>
          </div>
        </div>

        <h3 className="display text-base font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
          {p.question}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>
            by{' '}
            <span className="mono" style={{ color: 'var(--muted)' }}>
              {formatAddress(p.creator)}
            </span>
          </span>
          {isCreator && (
            <span
              className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
              style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--accent)' }}
            >
              You
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="px-5 pb-4 space-y-2.5">
        {p.options.map((opt, i) => {
          const idx = BigInt(i)
          const pct = votePercent(p.voteCounts[i], p.totalVotes)
          const isSelected = userVoted === true && userChoice === idx
          const isPendingThis = pendingOption === idx && isVoteBusy

          return (
            <div key={i} className="relative overflow-hidden rounded-2xl">
              {/* Background fill */}
              {(userVoted === true || p.closed) && (
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isSelected
                      ? 'rgba(18,45,69,0.10)'
                      : 'rgba(18,45,69,0.05)',
                  }}
                />
              )}

              <button
                onClick={() => canVote && !isVoteBusy && handleVote(idx)}
                disabled={!canVote || isVoteBusy || isPendingThis}
                className="relative flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all disabled:cursor-default"
                style={{
                  borderColor: isSelected ? 'var(--border-strong)' : 'var(--border)',
                  background: 'transparent',
                  cursor: canVote && !isVoteBusy ? 'pointer' : 'default',
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                    style={{
                      background: isSelected ? 'var(--accent)' : 'var(--surface-muted)',
                      color: isSelected ? 'white' : 'var(--muted)',
                    }}
                  >
                    {isPendingThis ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span style={{ color: 'var(--ink)' }}>{opt}</span>
                  {isSelected && (
                    <CheckCircle2 className="size-4 shrink-0" style={{ color: 'var(--success)' }} />
                  )}
                </span>

                {(userVoted === true || p.closed) && (
                  <span className="tabular-nums text-xs font-semibold ml-2" style={{ color: 'var(--muted)' }}>
                    {pct}%
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t px-5 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
          {formatTimestamp(p.createdAt)}
        </span>

        <div className="flex items-center gap-2">
          {/* Pending tx indicators */}
          {isVoteBusy && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <Loader2 className="size-3.5 animate-spin" />
              {voteIsPending ? 'Confirm in wallet…' : 'Recording vote…'}
            </span>
          )}
          {isCloseBusy && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <Loader2 className="size-3.5 animate-spin" />
              {closeIsPending ? 'Confirm in wallet…' : 'Closing poll…'}
            </span>
          )}

          {/* Already voted indicator */}
          {userVoted === true && !isVoteBusy && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
              <CheckCircle2 className="size-3.5" /> Voted
            </span>
          )}

          {/* Close poll button — creator only */}
          {isCreator && !p.closed && !isCloseBusy && !isVoteBusy && (
            <button
              onClick={handleClose}
              disabled={isWrongChain || isSwitching}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-red-50 disabled:opacity-40"
              style={{ color: 'var(--danger)' }}
            >
              <XCircle className="size-3.5" /> Close poll
            </button>
          )}

          {/* View tx links */}
          {voteHash && !isVoteBusy && (
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, voteHash) ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs underline"
              style={{ color: 'var(--accent-hover)' }}
            >
              <ExternalLink className="size-3.5" /> Tx
            </a>
          )}
          {closeHash && !isCloseBusy && (
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, closeHash) ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs underline"
              style={{ color: 'var(--accent-hover)' }}
            >
              <ExternalLink className="size-3.5" /> Tx
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
