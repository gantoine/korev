import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DiffHunk,
  DiffStat,
  Dialog,
  FileRow,
  Finding,
  IconButton,
  Input,
  Kbd,
  Logo,
  Radio,
  RiskBadge,
  Select,
  Switch,
  Tabs,
  Tag,
  Toast,
  Tooltip,
} from '../../design-system';
import { Row, Section } from './Section';
import {
  SAMPLE_FILES,
  SAMPLE_FINDINGS,
  SAMPLE_HUNK,
  SAMPLE_NOTE_LINE,
} from './sample-data';

export function BrandSection() {
  return (
    <Section title="Brand">
      <Row>
        <Logo size={28} />
        <Logo variant="mark" size={28} />
        <span className="text-accent-text">
          <Logo size={28} mono />
        </span>
      </Row>
    </Section>
  );
}

export function ButtonSection() {
  return (
    <Section title="Buttons">
      <Row>
        <Button variant="primary" icon="check" kbd="⌘↵">
          Approve
        </Button>
        <Button>Request changes</Button>
        <Button variant="ghost" icon="message-square">
          Ask Korev
        </Button>
        <Button variant="danger">Dismiss</Button>
        <Button variant="success" icon="git-merge">
          Merge
        </Button>
        <Button variant="primary" loading>
          Run review
        </Button>
        <Button disabled>Suggest fix</Button>
      </Row>
      <Row>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg" iconRight="arrow-right">
          Large
        </Button>
        <IconButton icon="copy" label="Copy" />
        <IconButton icon="panel-right" label="Toggle panel" active />
        <IconButton icon="search" label="Search" variant="secondary" />
        <IconButton icon="x" label="Close" size="sm" />
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </Row>
    </Section>
  );
}

export function FormSection() {
  const [search, setSearch] = useState('');
  const [repo, setRepo] = useState('acme/api');
  const [notify, setNotify] = useState(true);
  const [autoReview, setAutoReview] = useState(false);
  const [depth, setDepth] = useState<string | undefined>('thorough');
  return (
    <Section title="Forms">
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Search"
          icon="search"
          placeholder="Search or jump to…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          suffix={<Kbd>/</Kbd>}
        />
        <Input
          label="Path glob"
          mono
          placeholder="src/**/*.ts"
          hint="Matches files Korev reviews."
        />
        <Input
          label="Branch"
          defaultValue="main"
          error="Branch is protected."
        />
        <Select
          label="Repository"
          icon="folder-git-2"
          value={repo}
          onChange={setRepo}
          options={['acme/api', 'acme/billing', 'acme/web']}
        />
        <Input label="Disabled" placeholder="Not editable" disabled />
      </div>
      <Row>
        <Checkbox label="Notify me" checked={notify} onChange={setNotify} />
        <Checkbox label="Some files" indeterminate />
        <Checkbox label="Disabled" disabled />
        <Switch
          label="Review automatically"
          checked={autoReview}
          onChange={setAutoReview}
        />
        <Radio
          name="depth"
          value="quick"
          label="Quick"
          checked={depth === 'quick'}
          onChange={setDepth}
        />
        <Radio
          name="depth"
          value="thorough"
          label="Thorough"
          checked={depth === 'thorough'}
          onChange={setDepth}
        />
      </Row>
    </Section>
  );
}

export function DisplaySection() {
  return (
    <Section title="Display">
      <Row>
        <Badge>Draft</Badge>
        <Badge tone="accent" dot>
          Reviewing
        </Badge>
        <Badge tone="success">Approved</Badge>
        <Badge tone="warning">Waiting</Badge>
        <Badge tone="danger">Blocked</Badge>
        <Badge outline>Concurrency</Badge>
        <Badge count tone="accent">
          3
        </Badge>
        <Tag icon="git-branch" mono>
          feat/tenant-rate-limit
        </Tag>
        <Tag onRemove={() => undefined}>acme/api</Tag>
        <Avatar name="Maya Okafor" />
        <Avatar name="Jun Park" size={28} />
        <Avatar kind="korev" size={28} />
      </Row>
      <div className="grid grid-cols-2 gap-4">
        <Card
          title="Summary"
          icon="file-code-2"
          actions={<Badge>5 findings · 2 high</Badge>}
        >
          Replaces the IP-based legacy throttle with a per-tenant token bucket
          stored in Redis. Most of the 412 added lines are tests and docs.
        </Card>
        <Card interactive>
          <div className="flex items-center justify-between">
            <span className="type-h3">#491 Per-tenant rate limiting</span>
            <DiffStat additions={412} deletions={96} />
          </div>
        </Card>
      </div>
    </Section>
  );
}

export function NavigationSection() {
  const [tab, setTab] = useState('files');
  const [mode, setMode] = useState('unified');
  return (
    <Section title="Navigation">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview', icon: 'git-pull-request' },
          { id: 'files', label: 'Files', icon: 'file-code-2', count: 14 },
          { id: 'findings', label: 'Findings', icon: 'list-checks', count: 5 },
        ]}
      />
      <Tabs
        variant="pill"
        value={mode}
        onChange={setMode}
        tabs={[
          { id: 'unified', label: 'Unified' },
          { id: 'split', label: 'Split' },
        ]}
      />
    </Section>
  );
}

export function OverlaySection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <Section title="Overlays">
      <Row>
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Tooltip label="Copy SHA" kbd="C">
          <IconButton icon="copy" label="Copy SHA" />
        </Tooltip>
        <Tooltip label="Shown below" side="bottom">
          <Button size="sm">Hover me</Button>
        </Tooltip>
      </Row>
      <div className="flex flex-col gap-2">
        <Toast
          tone="success"
          title="Review posted — 3 comments on #482"
          onClose={() => undefined}
        />
        <Toast
          tone="accent"
          title="Korev is reviewing #479"
          description="Reading limiter.ts…"
        />
        <Toast
          tone="danger"
          title="Review failed"
          description="GitHub returned 502 for acme/api."
          action={<Button size="sm">Retry</Button>}
        />
      </div>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Approve with 2 open findings?"
        description="Both are high severity. They stay open on the pull request."
        footer={
          <>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Approve anyway
            </Button>
          </>
        }
      />
    </Section>
  );
}

export function ReviewSection() {
  const [activeFile, setActiveFile] = useState(SAMPLE_FILES[0].path);
  const [noteFinding] = SAMPLE_FINDINGS;
  return (
    <Section title="Review">
      <Row>
        <RiskBadge level="critical" />
        <RiskBadge level="high" />
        <RiskBadge level="medium" />
        <RiskBadge level="low" />
        <RiskBadge level="high" iconOnly />
        <DiffStat additions={64} deletions={12} />
      </Row>
      <div className="grid grid-cols-[260px_1fr] gap-4">
        <div className="flex flex-col gap-px">
          {SAMPLE_FILES.map((file) => (
            <FileRow
              key={file.path}
              {...file}
              active={file.path === activeFile}
              onClick={() => setActiveFile(file.path)}
            />
          ))}
        </div>
        <div className="overflow-hidden rounded-md border border-border-1">
          <DiffHunk
            lines={SAMPLE_HUNK}
            notes={{
              [SAMPLE_NOTE_LINE]: (
                <Finding
                  level={noteFinding.level}
                  category={noteFinding.category}
                  title={noteFinding.title}
                  active
                  actions={
                    <>
                      <Button size="sm" variant="primary">
                        Suggest fix
                      </Button>
                      <Button size="sm" variant="ghost">
                        Dismiss
                      </Button>
                    </>
                  }
                >
                  {noteFinding.body}
                </Finding>
              ),
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {SAMPLE_FINDINGS.map(({ id, body, ...finding }) => (
          <Finding key={id} {...finding}>
            {body}
          </Finding>
        ))}
      </div>
    </Section>
  );
}
