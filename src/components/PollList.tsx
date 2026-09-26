import { useCallback } from 'react'
import { useReadContract } from 'wagmi'
import { RefreshCw, Inbox } from 'lucide-react'
import { ArcPollContract, ARC_TESTNET_CHAIN_ID } from '../contract'
import { PollCard } from './PollCard'

interface PollListProps {
  filter: 'active' | 'all'
  refreshKey: number
  onUpdate: () => void
}

const SKELETON_CARDS = Array.from({ length: 3 }, (_, i) => i)
const SKELETON_ROWS = Array.from({ length: 3 }, (_, i) => i)

export function PollList({ filter, refreshKey: _refreshKey, onUpdate }: PollListProps) {
  const {
    data: pollIds,
    isLoading,
    refetch,
    isFetching,
  } = useReadContract({
    ...ArcPollContract,
    functionName: filter === 'active' ? 'getActivePolls' : 'getAllPollIds',
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const handleUpdate = useCallback(() => {
    void refetch()
    onUpdate()
  }, [refetch, onUpdate])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {SKELETON_CARDS.map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-3xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="mb-4 h-4 w-2/3 rounded-lg" style={{ background: 'var(--surface-muted)' }} />
            <div className="space-y-2">
              {SKELETON_ROWS.map((j) => (
                <div key={j} className="h-10 rounded-xl" style={{ background: 'var(--surface-muted)' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const ids = (pollIds as bigint[] | undefined) ?? []
  // Reverse so newest polls appear first
  const sorted = [...ids].reverse()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {sorted.length} {filter === 'active' ? 'active' : 'total'} poll{sorted.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-50 disabled:opacity-40"
          style={{ color: 'var(--accent-hover)' }}
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {sorted.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-3xl py-14 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="mb-4 flex size-12 items-center justify-center rounded-2xl"
            style={{ background: 'var(--surface-muted)' }}
          >
            <Inbox className="size-6" style={{ color: 'var(--subtle)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--ink)' }}>
            {filter === 'active' ? 'No active polls' : 'No polls yet'}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {filter === 'active'
              ? 'Create a new poll above or switch to all polls.'
              : 'Be the first to create a poll!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((id) => (
            <PollCard key={id.toString()} pollId={id} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
