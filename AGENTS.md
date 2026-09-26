# Arc Poll

> Built with Arc Studio — money-powered apps in minutes

This is the **project memory** — what Arc Studio remembers about building this app.

---

## What This App Does

Arc Poll is a decentralized onchain polling application on Arc Testnet. Any connected wallet can:
- Create polls (question + 2–4 options)
- Vote once per poll per wallet (recorded onchain)
- View live vote counts and percentages
- Close their own polls (creators only)

All state lives in the `ArcPoll` Solidity smart contract. The frontend is non-custodial: it never holds keys or funds.

---

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Arc Light design tokens
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.20 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/ArcPoll.t.sol` (51 tests, all passing). Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002)
- Toasts: Sonner

---

## Deployed Contract

| Contract | Network | Address |
|---|---|---|
| ArcPoll | Arc Testnet | `0x2d6c6b59887047c91d02cc89258eba7456fc40df` |
| | | [View on ArcScan](https://explorer.testnet.arc.io/address/0x2d6c6b59887047c91d02cc89258eba7456fc40df) |

Contract metadata: `contracts/contract-metadata/ArcPoll.json`

---

## Key Files

- `contracts/ArcPoll.sol` — Smart contract (createPoll, vote, closePoll, getPoll, getResults, getActivePolls, getAllPollIds)
- `contracts/test/ArcPoll.t.sol` — Foundry tests (51 tests covering happy path, reverts, events, fuzz)
- `src/App.tsx` — App shell with tab filter (Active / All polls)
- `src/contract.ts` — Contract address + ABI import
- `src/utils.ts` — formatAddress, formatTimestamp, parseContractError, votePercent
- `src/components/Header.tsx` — Sticky header with ConnectKit button, wallet address, network badge
- `src/components/CreatePollForm.tsx` — Collapsible form for poll creation
- `src/components/PollList.tsx` — Reads getActivePolls/getAllPollIds, renders PollCard list
- `src/components/PollCard.tsx` — Per-poll card: vote options with percentage bars, close button for creators

---

## To Run

```bash
bun install
bun run dev
```

---

## Security Notes

- No private keys, seeds, or secrets in source code
- No hardcoded RPC tokens
- Contract has no admin/owner at the contract level (per-poll creator model only)
- `.env` covered by `.gitignore`
- 51 Foundry tests pass; balanced security review came back clean
