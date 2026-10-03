import { useState, type FormEvent } from 'react';
import { Button, Input } from '../../design-system';
import { isRepoName } from './repo-name';

export interface AddRepoInputProps {
  onAdd: (repo: string) => void;
}

const SHAPE_ERROR = 'Use the owner/name format, like acme/api.';

export function AddRepoInput({ onAdd }: AddRepoInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();

  function submit(event: FormEvent) {
    event.preventDefault();
    const repo = value.trim();
    if (!isRepoName(repo)) {
      setError(SHAPE_ERROR);
      return;
    }
    onAdd(repo);
    setValue('');
    setError(undefined);
  }

  return (
    <form onSubmit={submit} className="flex items-start gap-2">
      <Input
        aria-label="Add a repo"
        placeholder="owner/name"
        mono
        value={value}
        error={error}
        onChange={(event) => setValue(event.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={!value.trim()}>
        Add
      </Button>
    </form>
  );
}
