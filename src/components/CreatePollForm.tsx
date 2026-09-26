import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { ArcPollContract, ARC_TESTNET_CHAIN_ID } from '../contract'
import { parseContractError } from '../utils'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface CreatePollFormProps {
  onPollCreated: () => void
}

export function CreatePollForm({ onPollCreated }: CreatePollFormProps) {
  const { address, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const {
    writeContract,
    data: hash,
    isPending,
    reset,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const isWrongChain = address != null && chainId !== ARC_TESTNET_CHAIN_ID
  const isWorking = isPending || isConfirming

  // Refresh after success
  const handleSuccess = useCallback(() => {
    if (isSuccess && hash) {
      const explorerUrl = buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, hash)
      toast.success('Poll created!', {
        description: 'Your poll is now live onchain.',
        action: explorerUrl
          ? { label: 'View tx', onClick: () => window.open(explorerUrl, '_blank') }
          : undefined,
      })
      setQuestion('')
      setOptions(['', ''])
      setOpen(false)
      reset()
      onPollCreated()
    }
  }, [isSuccess, hash, reset, onPollCreated])

  // Effect-equivalent via render check
  if (isSuccess && hash) {
    handleSuccess()
  }

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ''])
  }

  const removeOption = (i: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, val: string) => {
    setOptions(options.map((o, idx) => (idx === i ? val : o)))
  }

  const handleCreate = () => {
    if (!address) return
    if (isWrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
      return
    }
    if (!question.trim()) {
      toast.error('Enter a poll question.')
      return
    }
    if (options.some((o) => !o.trim())) {
      toast.error('All options must have text.')
      return
    }

    writeContract(
      {
        ...ArcPollContract,
        functionName: 'createPoll',
        args: [question.trim(), options.map((o) => o.trim())],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        onError: (err) => toast.error(parseContractError(err)),
      }
    )
  }

  if (!address) {
    return (
      <div
        className="rounded-3xl p-6 text-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Connect your wallet to create a poll.
        </span>
      </div>
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
      {/* Collapsed header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ color: 'var(--ink)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-7 items-center justify-center rounded-lg"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="size-4 text-white" />
          </div>
          <span className="font-semibold">Create a New Poll</span>
        </div>
        {open ? (
          <ChevronUp className="size-4" style={{ color: 'var(--subtle)' }} />
        ) : (
          <ChevronDown className="size-4" style={{ color: 'var(--subtle)' }} />
        )}
      </button>

      {/* Expanded form */}
      {open && (
        <div
          className="border-t px-5 pb-5 pt-4 space-y-4"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Question */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Question
            </label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              maxLength={200}
              disabled={isWorking}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-300 focus:border-blue-400 disabled:opacity-50"
              style={{
                background: 'var(--surface-muted)',
                borderColor: 'var(--border)',
                color: 'var(--ink)',
              }}
            />
          </div>

          {/* Options */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Options ({options.length}/4)
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                    style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    maxLength={100}
                    disabled={isWorking}
                    className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-slate-300 focus:border-blue-400 disabled:opacity-50"
                    style={{
                      background: 'var(--surface-muted)',
                      borderColor: 'var(--border)',
                      color: 'var(--ink)',
                    }}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      disabled={isWorking}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="size-4" style={{ color: 'var(--danger)' }} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 4 && (
              <button
                onClick={addOption}
                disabled={isWorking}
                className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-slate-50 disabled:opacity-40"
                style={{ color: 'var(--accent-hover)' }}
              >
                <Plus className="size-3.5" />
                Add option
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={isWorking || isSwitching}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {isSwitching ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Switching network...
              </span>
            ) : isWrongChain ? (
              'Switch to Arc Testnet'
            ) : isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Confirm in wallet...
              </span>
            ) : isConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Creating poll...
              </span>
            ) : (
              'Create Poll'
            )}
          </button>

          {/* Tx hash */}
          {hash && !isSuccess && (
            <p className="text-center text-xs" style={{ color: 'var(--subtle)' }}>
              Transaction submitted.{' '}
              <a
                href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, hash) ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ color: 'var(--accent-hover)' }}
              >
                View on ArcScan
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
