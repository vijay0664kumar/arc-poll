/**
 * Arc Poll — Decentralized Onchain Polling Application
 * Built with Arc Studio on Arc Testnet
 */

import { useState, useCallback } from 'react'
import { Header } from './components/Header'
import { CreatePollForm } from './components/CreatePollForm'
import { PollList } from './components/PollList'

type Filter = 'active' | 'all'

export default function App() {
  const [filter, setFilter] = useState<Filter>('active')
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      <Header />

      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1
            className="display text-3xl font-bold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            Arc Poll
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Create polls, vote onchain, see live results — all on Arc Testnet.
          </p>
        </div>

        {/* Create form */}
        <div className="mb-8">
          <CreatePollForm onPollCreated={triggerRefresh} />
        </div>

        {/* Filter tabs */}
        <div
          className="mb-6 flex rounded-2xl p-1"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          {(['active', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all"
              style={
                filter === f
                  ? {
                      background: 'white',
                      color: 'var(--ink)',
                      boxShadow: '0 1px 4px rgba(18,45,69,0.10)',
                    }
                  : { color: 'var(--subtle)' }
              }
            >
              {f === 'active' ? 'Active Polls' : 'All Polls'}
            </button>
          ))}
        </div>

        {/* Poll list */}
        <PollList filter={filter} refreshKey={refreshKey} onUpdate={triggerRefresh} />
      </main>
    </div>
  )
}
