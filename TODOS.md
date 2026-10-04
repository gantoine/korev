# TODOS

- **Sign and notarize the macOS build.** Packaged builds are unsigned, so Gatekeeper blocks them on other machines. Needs an Apple Developer ID certificate, `osxSign` + `osxNotarize` in `korev-desktop/forge.config.mts`, and the credentials as CI secrets.
- **Tune the suggested priority.** Wait-time points stop at 5 days, so any request older than about 5 days is P1, while a fresh team request is P3. Against real data no request landed on P2. Rebalance the weights in `korev-desktop/src/inbox/priority.ts`.
- **Check the OAuth-restriction rows against a real restricted org.** The detection uses GitHub's documented error message, because a classic token can't reproduce the restriction. Sign in with the OAuth app, open an org that hasn't approved Korev (for example albycom), and confirm the "Waiting for approval from an owner" row and the repo banner.
- **Start the notifications check sooner.** The first check runs one poll interval (60s) after the first sync, which also makes the e2e test take about a minute.
