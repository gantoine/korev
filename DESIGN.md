# Korev design

How the Korev desktop app looks and behaves. The tokens live in
`korev-desktop/src/design-system/styles/tokens.css`; this file says how to use them.
The design-system gallery shows every component in both themes (run the app in dev
and open `#gallery`).

## Tokens

- **Use semantic tokens only.** Surfaces `bg-app` → `bg-surface` → `bg-raised`, with
  `bg-hover` and `bg-active` for interaction. Text `fg-1` (primary) → `fg-2` → `fg-3`
  (secondary, metadata, column headers). Borders `border-1` (hairlines) and `border-2`
  (controls). Never use a hex value or a raw palette step (`gray-600`, `cobalt-500`) in
  app code.
- **One accent.** Cobalt (`accent`, `accent-text`, `accent-subtle`) marks the selected
  thing, the primary action and the stack label. It never means "good" or "bad".
- **Status colours carry meaning.** `danger` = needs you now, `warning` = attention
  soon, `success` = done or ready, neutral (`bg-active` + `fg-2`) = informational.
- **Layout.** `--sidebar-w` 248px, `--topbar-h` 48px, `--panel-w` 380px. Rows are at
  least 52px tall.
- **Motion.** `--dur-fast` for hover and press, `--dur-base` for fades. Rows never
  animate when the list reorders. Spinners stop under `prefers-reduced-motion`.
- **Themes.** Dark is the default token set; `[data-theme='light']` overrides it. The
  app follows the macOS appearance unless Settings → Appearance overrides it.

## Badge roles

| Badge | Use | Tone |
| --- | --- | --- |
| Reason chip | Why a PR is in its section ("2 checks failing") | danger / warning / neutral / success, from the reason's severity |
| P-badge | Suggested priority of a review request (P1–P3) | P1 danger, P2 warning, P3 neutral |
| `SizeBadge` | Size of a PR (S/M/L), lockfiles excluded | always neutral |
| Draft | Only mark shown on a review request row | outline |
| Approved | Priority column of an "Already approved" row when a person approved | success |
| Bot approved | Priority column of an "Already approved" row when only bots approved | neutral |
| Action chip | My PR row while Korev acts on it: "Merging…" (with `loader`), "Still merging on GitHub", "Merge failed" | neutral, or danger for a failure |
| Queue chip | "In Trunk queue" / "In merge queue" (In progress); "Removed from Trunk queue" (Needs you) | neutral / warning |
| Repo urgency | Repo header: "2 need you" (My PRs) or "1 P1" (Review requests) | danger, shown only when something is urgent |
| Stack | Header of a stack group | accent |
| Sidebar count | My PRs = Needs you count; Review requests = requests waiting | danger when something needs you or a P1 exists, otherwise neutral |

`RiskBadge` is reserved for review findings. Do not use it for size or priority.

## Wording

- "Ready to merge" appears only in My PRs. Review requests show only "Draft".
- Say "Size", never "complexity". The priority column is "Suggested priority".
- Priority is explained in plain reasons ("Requested from you directly · waiting 3d ·
  blocks 2 layers · small"), never as a number.
- When the request time is unknown: "PR opened 3d ago · request time unknown".
- "Already approved" rows say why they moved: "You approved", "Approved by @sakce",
  "Approved", or "Approved by bot @stamphog" when every approval came from a bot.

## Row anatomy

- **Line 1:** CI icon, then the title in `type-ui` medium. The title takes the remaining
  width, never less than 240px, and ellipsizes with a tooltip.
- **Line 2:** `fg-3`, 12px. The repo header already names the repo, so line 2 never
  repeats it. My PRs: `#num · updated 12m`. Review requests:
  `@author · #num · Requested from you · 2d` (or `· via @acme/frontend`). Already
  approved: `@author · #num · via @acme/frontend · Approved by @sakce`.
- **Right side, fixed columns.** My PRs: the most severe reason chip, plus "+N" when
  there are more. Review requests: P-badge · file count · Size · Draft badge · CI.
- On narrow windows, the file count and "updated" drop first.

## Stacks

- Layers render bottom-first (position 1, closest to the base branch, at the top), with
  "1 of 4" labels and a connector line. The header names the base branch
  ("Stack → main"); the repo header above it names the repo.
- A teammate's open layer stays full contrast and reads "Waiting on @alex". Only merged
  or closed layers use `fg-3` text. Never dim with opacity.
- My PRs places a stack in the most urgent section among the viewer's own open layers,
  and the header says why ("Needs you: #304 Lint failing").
- Review requests group requests from one stack under a compact header ("acme/web ·
  stack · you're asked on 2 of 4"). Layers not requested from the viewer collapse into
  one expandable line.

## Repo groups

- Both lists group PRs by repo first, in the order set in Settings → Repositories →
  Inbox order. Repos Korev no longer watches go last, alphabetically. A repo with no PRs
  is hidden.
- **Repo header:** about 36px, a listbox option. Chevron, the repo name in mono
  `type-ui` semibold `fg-1`, a mono count in `fg-2` ("3 open", "2 waiting") and the
  repo urgency badge. Sticky on `bg-app` with a `border-1` bottom hairline, never a
  card. It sits below the updates pill.
- ←/→ or Enter collapses and expands a repo header; it never opens the panel. Collapse
  state is saved per view. A collapsed repo keeps its urgency badge, and new urgent
  PRs never expand it.
- My PRs: inside each repo, the urgency sections (Needs you, In progress, Ready to
  merge). Review requests: inside each repo, requests in suggested-priority order, then
  a collapsed "Already approved" toggle with a mono count. A team request moves there
  when you, a member of the requesting team, or GitHub's overall review decision
  approved it. Direct requests always stay. Approved rows are left out of the counts.

## States and the banner slot

- **Loading:** skeleton rows in the shape of the final list: two repo header bars with
  a few rows each. No spinner in the list.
- **Empty:** one plain sentence ("No reviews waiting on you."). A section with no PRs
  hides its header. When only already-approved requests remain, the sentence sits above
  their repo groups.
- **Error:** the message and a Retry button replace the list. Never a toast.
- **Partial or stale:** the list stays, and one banner slot above it explains why
  (offline, rate limited, a repo Korev can no longer read). More than one problem
  collapses into "3 problems ▾".
- Toasts are only for short confirmations ("Repos saved").
- Sync status lives only in the topbar ("Synced 2m ago", "Offline · data from 14:02",
  "Reconnect GitHub"). Data from an earlier day names the day ("data from Fri 14:02").
- **Cached launch:** Korev opens with the inbox it saved at the last sync. The topbar
  reads "Syncing… · data from 14:02" until the first sync lands. Cached rows are never
  dimmed or turned into skeletons, and the first live sync replaces them without the
  updates pill.
- **Locked sign-in:** when the keychain refuses the saved sign-in, Setup shows "Korev
  couldn't unlock your saved GitHub sign-in" with Try again and Sign in again, never the
  Connect screen.

## Merge and close

- Only My PRs can merge or close. The side panel footer has one primary button:
  Merge (labelled for the repo's path) when the PR is ready to merge, Cancel when it
  is in a queue, otherwise Open on GitHub. Close sits next to it in the danger
  variant. Rows never carry buttons.
- Every action asks first. Confirms name PRs by number, never "above" or "below":
  "Merges #301, #302 and #303", "Includes @alex's #301", "#303 and #304 are built on
  this and will lose their base." A layer that isn't ready disables Merge and says why
  ("#301 isn't ready: lint failing"). A stack Korev only partly sees offers Open on
  GitHub instead.
- The merge button follows the path: "Merge", "Add to merge queue", "Send to Trunk" /
  "Send to Mergify" / "Send to Aviator". Comment paths show the comment first: "Posts
  `/trunk merge` on #303. Your team sees this comment."
- Merge confirms focus Merge; Close confirms focus Cancel. ⌘↵ confirms, Esc cancels.
  The merge method radio shows only when the repo allows more than one.
- Merge and Close stay disabled until the first live sync after launch ("Waiting for
  GitHub sync").
- While merging, every layer in the range shows "Merging…" and rows don't move. A merge
  that fails shows "Merge failed" on the row and GitHub's reason in the panel, and is
  announced. Success shows the toast "Merged #301–#303". A close leaves the row as
  "Closed · gone on next refresh" with a "Closed #302" toast that offers Reopen.

## Keyboard model

- Each list is one `listbox` with roving focus. `j`/`k` or ↓/↑ move between rows,
  across repo headers and sections, and into stack layers.
- Enter opens the PR, ⌘Enter opens it on GitHub, Esc closes the side panel and returns
  focus to the row. In My PRs, ⇧M and ⇧X open the merge and close confirms for the
  selected PR, even with the panel closed.
- ⌘1 / ⌘2 switch views, ⌘, opens Settings, ⌘R refreshes, `?` shows the shortcut sheet.
- Single-letter shortcuts are ignored while a text field has focus.
- Tab order: sidebar → list → panel. Every focusable element shows `--focus-ring` on
  `:focus-visible`.

## Contrast and non-colour signals

- Every text pair meets WCAG AA in both themes: 4.5:1, or 3:1 for text 14px semibold
  and larger.
- Colour is never the only signal. CI uses distinct icons (passing `circle-check`,
  failing `circle-x`, running `loader`, none `circle-dashed`), each with an
  `aria-label` such as "CI failing". P-badges read "Suggested priority 1", and sidebar
  counts read "3 need you".
