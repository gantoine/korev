import type { Problem, ProblemKind } from '../../shared/inbox';
import { splitRepoName } from '../repo-names';
import { accessActionUrl, classifyAccess } from './access';
import { redactToken } from './errors';
import type { GraphqlError } from './graphql';
import type { RepoAccessTarget } from './queries';

export interface RepoRename {
  from: string;
  to: string;
}

export interface RepoAccessReport {
  problems: Problem[];
  renames: RepoRename[];
}

export interface RepoAccessResponse {
  data: object;
  errors: GraphqlError[];
  ssoHeader: string | null;
  token: string;
}

interface RepoAccessNode {
  nameWithOwner: string;
  isArchived: boolean;
}

const ACCESS_MESSAGES: Record<
  ProblemKind,
  (repo: string, githubMessage: string) => string
> = {
  not_found: (repo) =>
    `Can't find ${repo}. It was deleted, or you lost access.`,
  restricted: (repo) =>
    `Can't read ${repo} until an owner of ${splitRepoName(repo).owner} approves Korev.`,
  sso: (repo) => `Authorize Korev for SSO to read ${repo}.`,
  archived: (repo) => `${repo} is archived, no new PRs.`,
  other: (_repo, githubMessage) => githubMessage,
};

export function readRepoAccess(
  targets: RepoAccessTarget[],
  response: RepoAccessResponse,
): RepoAccessReport {
  return {
    problems: presentValues(
      targets.map((target) => targetProblem(target, response)),
    ),
    renames: presentValues(
      targets.map((target) => targetRename(target, response.data)),
    ),
  };
}

export function isRepoAccessError(
  error: GraphqlError,
  targets: RepoAccessTarget[],
): boolean {
  return targets.some((target) => target.alias === error.path?.[0]);
}

export function applyRenames(repos: string[], renames: RepoRename[]): string[] {
  const renamed = new Map(renames.map((rename) => [rename.from, rename.to]));
  return repos.map((repo) => renamed.get(repo) ?? repo);
}

function accessNode(
  target: RepoAccessTarget,
  data: object,
): RepoAccessNode | null | undefined {
  return (data as Record<string, RepoAccessNode | null | undefined>)[
    target.alias
  ];
}

function targetProblem(
  target: RepoAccessTarget,
  response: RepoAccessResponse,
): Problem | null {
  const node = accessNode(target, response.data);
  if (node === null) return unreadableProblem(target, response);
  if (!node?.isArchived) return null;
  return repoProblem('archived', node.nameWithOwner, '', null);
}

function targetRename(
  target: RepoAccessTarget,
  data: object,
): RepoRename | null {
  const node = accessNode(target, data);
  if (!node || node.nameWithOwner === target.repo) return null;
  return { from: target.repo, to: node.nameWithOwner };
}

function unreadableProblem(
  target: RepoAccessTarget,
  response: RepoAccessResponse,
): Problem {
  const error = response.errors.find((candidate) =>
    isRepoAccessError(candidate, [target]),
  );
  if (!error) return repoProblem('not_found', target.repo, '', null);
  const kind = classifyAccess(error, response.ssoHeader);
  return repoProblem(
    kind,
    target.repo,
    redactToken(error.message, response.token),
    accessActionUrl(kind, target.owner, response.ssoHeader),
  );
}

function repoProblem(
  kind: ProblemKind,
  repo: string,
  githubMessage: string,
  actionUrl: string | null,
): Problem {
  return {
    kind,
    repo,
    message: ACCESS_MESSAGES[kind](repo, githubMessage),
    actionUrl,
  };
}

function presentValues<T>(values: (T | null)[]): T[] {
  return values.filter((value): value is T => value !== null);
}
