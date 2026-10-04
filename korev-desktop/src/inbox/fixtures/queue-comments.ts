export const TRUNK_INITIAL = `<!-- Trunk Merge -->
Merging to \`master\` in this repository is managed by Trunk.

<!-- Start PR Submit Checkbox -->
- [ ] <!-- End PR Submit Checkbox -->To merge this pull request, check the box to the left or comment \`/trunk merge\` below.

After your PR is submitted to the merge queue, this comment will be automatically updated with its status. If the PR fails, failure details will also be posted here`;

export const TRUNK_REMOVED_FAILED_TESTS = `❌ This pull request was removed from the merge queue because it failed tests. PR [#5533](https://www.github.com/hiero-ledger/solo/pull/5533) was used for testing. See more details [here](https://app.trunk.io/swirldslabs/merge-queue/366f70b9-609c-4773-9462-3e6f936b4ab8/5315).
|Failed Required Status|Conclusion|
|-|-|
|E2E Tests (One Shot Single - using Podman) / One Shot Single - using Podman|[Failure](https://github.com/hiero-ledger/solo/actions/runs/30618384381/job/91119286424?pr=5315)|
<!-- Start PR Submit Checkbox -->
- [ ] <!-- End PR Submit Checkbox -->To merge this pull request, check the box to the left or comment \`/trunk merge\` below.

After your PR is submitted to the merge queue, this comment will be automatically updated with its status. If the PR fails, failure details will also be posted here`;

export const TRUNK_REMOVED_CANCELED = `🚫 This pull request was removed from the merge queue because it was canceled by Matt Wilkinson (a GitHub user). See more details [here](https://app.trunk.io/rigelbuild/merge-queue/15c439d4-b547-40bc-a331-124e5460f69e/1382).
<!-- Start PR Submit Checkbox -->
- [ ] <!-- End PR Submit Checkbox -->To merge this pull request, check the box to the left or comment \`/trunk merge\` below.

After your PR is submitted to the merge queue, this comment will be automatically updated with its status. If the PR fails, failure details will also be posted here`;

export const TRUNK_SUBMITTED = `✨ Submitted to Merge by @andrewm4894. It will be added to the merge queue once all branch protection rules pass. See more details [here](https://app.trunk.io/posthog-inc/merge-queue/3921a8a3-abf7-42ff-b9cf-ef4fab8f3649/111285).`;

export const MERGIFY_DEQUEUED_CONFLICT = `<!---
DO NOT EDIT
-*- Mergify Payload -*-
{"version": 1, "state": "dequeued", "queue_rule_name": "default", "queued_at": "2026-10-04T08:40:18.466142+00:00", "estimated_time_of_merge": null, "speculative_check_pr": null, "required_conditions": []}
-*- Mergify Payload End -*-
-->

# Merge Queue Status

- ✅ **Entered queue** — \`2026-10-04 08:40 UTC\` · Rule: \`default\` · triggered by @IvanWng97 with the [\`@mergifyio queue\` command](https://github.com/IvanWng97/pixtuoid/pull/1236#issuecomment-5978087428)
- 🚫 **Left the queue** — \`2026-10-04 10:04 UTC\` · at \`82106cbce3c8cc070be1bd8c0923e8a0fd7ceddd\`

This pull request spent **1 hour 24 minutes 20 seconds** in the queue, with no time running CI.

## Reason

The pull request can't be updated

> merge conflict between base and head`;

export const AVIATOR_FAILED_CHECKS = `This pull request failed to merge: some required checks failed. After you have resolved the problem, you should remove the \`blocked\` pull request label from this PR and then try to re-queue the PR.

Failed checks: [validate](https://github.com/unionai/helm-charts/actions/runs/33140719169/job/98750749953)`;
