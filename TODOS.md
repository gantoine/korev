# TODOS

- **P1 · Sign and notarize the macOS build.** This is the real fix for "reconnect GitHub on every launch". The macOS keychain gives the saved sign-in back only to an app with the same code signature, and an unsigned build changes its signature with every update. Korev now shows "Korev couldn't unlock your saved GitHub sign-in" when that happens, but only signing stops it. Unsigned builds are also blocked by Gatekeeper on other machines. Needs an Apple Developer ID certificate, `osxSign` + `osxNotarize` in `korev-desktop/forge.config.mts`, and the credentials as CI secrets.
- **Tune the suggested priority.** Wait-time points stop at 5 days, so any request older than about 5 days is P1, while a fresh team request is P3. Against real data no request landed on P2. Rebalance the weights in `korev-desktop/src/inbox/priority.ts`.
- **Check the OAuth-restriction rows against a real restricted org.** The detection uses GitHub's documented error message, because a classic token can't reproduce the restriction. Sign in with the OAuth app, open an org that hasn't approved Korev (for example albycom), and confirm the "Waiting for approval from an owner" row and the repo banner.
- **Start the notifications check sooner.** The first check runs one poll interval (60s) after the first sync, which also makes the e2e test take about a minute.

## Architecture

- **P3 · Move the inbox to a backend with a sync engine when a trigger appears.** Korev is local-first today: the main process keeps the inbox in memory, saves an encrypted copy (`korev-desktop/src/main/inbox-cache.ts`) and applies user actions on top of each snapshot. A backend means a GitHub App with webhooks plus a hosted sync engine (Zero, Electric or LiveStore), with a local SQLite store arriving with it or just before it. `inbox-cache.ts` and the poller's in-memory state are the parts to replace. Start it when one of these becomes real:
  - team features: shared triage, assigning a PR to someone
  - more than one device
  - notifications while the app is closed
  - polling hits GitHub rate limits as the number of repos grows
  - history Korev should search: past reviews, AI findings

  Claude Code and Codex subscriptions run only on the user's machine, so LLM actions stay local either way.
