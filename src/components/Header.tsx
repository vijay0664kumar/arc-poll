import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { formatAddress } from '../utils'
import { ARC_TESTNET_CHAIN_ID } from '../contract'

export function Header() {
  const { address, chainId } = useAccount()
  const isWrongChain = address != null && chainId !== ARC_TESTNET_CHAIN_ID

  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent)' }}
          >
            <span className="display text-sm font-bold text-white">AP</span>
          </div>
          <div>
            <span className="display text-base font-bold" style={{ color: 'var(--ink)' }}>
              Arc Poll
            </span>
            <div className="flex items-center gap-1">
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ background: 'var(--success)' }}
              />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Arc Testnet
              </span>
            </div>
          </div>
        </div>

        {/* Wallet info + connect */}
        <div className="flex items-center gap-3">
          {isWrongChain && (
            <span
              className="hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex"
              style={{ background: 'rgba(186,43,76,0.10)', color: 'var(--danger)' }}
            >
              Wrong network
            </span>
          )}
          {address && !isWrongChain && (
            <span
              className="mono hidden rounded-full px-2.5 py-1 text-xs sm:inline-flex"
              style={{
                background: 'var(--surface-muted)',
                color: 'var(--muted)',
              }}
            >
              {formatAddress(address)}
            </span>
          )}
          <ConnectKitButton
            customTheme={{
              '--ck-font-family': "'DM Sans', sans-serif",
              '--ck-primary-button-background': '#122d45',
              '--ck-primary-button-hover-background': '#1061a6',
              '--ck-body-background': '#ffffff',
              '--ck-body-color': '#122d45',
              '--ck-border-radius': '12px',
            }}
          />
        </div>
      </div>

      {/* Wrong chain banner */}
      {isWrongChain && (
        <div
          className="border-t px-4 py-2 text-center text-xs font-medium"
          style={{
            background: 'rgba(186,43,76,0.06)',
            borderColor: 'rgba(186,43,76,0.15)',
            color: 'var(--danger)',
          }}
        >
          Switch to <strong>{arcTestnet.name}</strong> to interact with Arc Poll.
        </div>
      )}
    </header>
  )
}
