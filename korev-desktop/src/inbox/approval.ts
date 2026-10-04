import type { Approval, ReviewRequest } from '../shared/inbox';
import type { PullRequest, SubmittedReview } from '../shared/pull-request';
import { requestingViewerTeams, sameName, type Viewer } from './request-age';

function approvals(pr: PullRequest): SubmittedReview[] {
  return pr.reviews.filter((review) => review.state === 'APPROVED');
}

function isViewerLogin(login: string, viewer: Viewer): boolean {
  return viewer.login !== null && sameName(login, viewer.login);
}

function teammateApproval(
  pr: PullRequest,
  viewer: Viewer,
  approved: SubmittedReview[],
): SubmittedReview | undefined {
  const members = requestingViewerTeams(pr, viewer).flatMap(
    (team) => team.members,
  );
  return approved.find(
    (review) =>
      !review.isBot && members.some((member) => sameName(member, review.login)),
  );
}

function overallApproval(approved: SubmittedReview[]): Approval {
  const onlyBots =
    approved.length > 0 && approved.every((review) => review.isBot);
  if (onlyBots) return { kind: 'bot', login: approved[0].login };
  return { kind: 'overall' };
}

export function approvalFor(
  pr: PullRequest,
  request: ReviewRequest,
  viewer: Viewer,
): Approval | null {
  if (request.direct) return null;
  const approved = approvals(pr);
  if (approved.some((review) => isViewerLogin(review.login, viewer))) {
    return { kind: 'you' };
  }
  const teammate = teammateApproval(pr, viewer, approved);
  if (teammate) return { kind: 'teammate', login: teammate.login };
  if (pr.reviewDecision !== 'APPROVED') return null;
  return overallApproval(approved);
}
