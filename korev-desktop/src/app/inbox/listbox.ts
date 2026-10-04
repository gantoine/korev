import {
  createContext,
  useContext,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { hasCommandModifier } from '../keyboard';

export interface ListboxApi {
  selectedKey: string | null;
  select(key: string): void;
  activate(key: string): void;
  openExternal(url: string): void;
}

const NO_LISTBOX: ListboxApi = {
  selectedKey: null,
  select: () => undefined,
  activate: () => undefined,
  openExternal: () => undefined,
};

const ListboxContext = createContext<ListboxApi>(NO_LISTBOX);

export const ListboxProvider = ListboxContext.Provider;

const OPTION_SELECTOR = '[role="option"]';
const ROVING_IDLE = -1;
const ROVING_STOP = 0;

const MOVES: Partial<Record<string, number>> = {
  j: 1,
  ArrowDown: 1,
  k: -1,
  ArrowUp: -1,
};

const EXPAND_KEYS: Partial<Record<string, boolean>> = {
  ArrowRight: false,
  ArrowLeft: true,
};

export interface OptionBehavior {
  url?: string;
  onActivate?: () => void;
}

export function useListOption(key: string, behavior: OptionBehavior = {}) {
  const api = useContext(ListboxContext);
  const { url, onActivate } = behavior;
  function click(event: MouseEvent) {
    if (url && hasCommandModifier(event)) {
      api.openExternal(url);
      return;
    }
    api.select(key);
    if (onActivate) onActivate();
    else api.activate(key);
  }
  return {
    role: 'option',
    tabIndex: ROVING_IDLE,
    'aria-selected': api.selectedKey === key,
    'data-option-key': key,
    'data-url': url,
    onFocus: () => api.select(key),
    onClick: click,
  };
}

export function optionElements(listbox: Element): HTMLElement[] {
  return [...listbox.querySelectorAll<HTMLElement>(OPTION_SELECTOR)];
}

export function findOption(
  listbox: Element | null,
  key: string | null,
): HTMLElement | null {
  if (!listbox || !key) return null;
  const options = optionElements(listbox);
  return options.find((option) => option.dataset.optionKey === key) ?? null;
}

export function focusOption(listbox: Element | null, key: string | null) {
  findOption(listbox, key)?.focus();
}

export function focusRovingStop(listbox: Element | null) {
  if (!listbox) return;
  optionElements(listbox)
    .find((option) => option.tabIndex === ROVING_STOP)
    ?.focus();
}

export function updateRovingStop(listbox: Element | null, key: string | null) {
  if (!listbox) return;
  const options = optionElements(listbox);
  const stop = findOption(listbox, key) ?? options[0];
  options.forEach((option) => {
    option.tabIndex = option === stop ? ROVING_STOP : ROVING_IDLE;
  });
}

function currentOption(event: KeyboardEvent<HTMLElement>): HTMLElement | null {
  if (!(event.target instanceof Element)) return null;
  return event.target.closest<HTMLElement>(OPTION_SELECTOR);
}

function moveFocus(listbox: Element, from: HTMLElement, step: number) {
  const options = optionElements(listbox);
  const next = options[options.indexOf(from) + step];
  next?.focus();
}

function toggleIfExpanded(option: HTMLElement, expanded: boolean) {
  if (option.getAttribute('aria-expanded') === String(expanded)) option.click();
}

function openOption(
  event: KeyboardEvent<HTMLElement>,
  option: HTMLElement,
  api: ListboxApi,
) {
  const url = option.dataset.url;
  if (hasCommandModifier(event) && url) api.openExternal(url);
  else option.click();
}

export function handleListboxKey(
  event: KeyboardEvent<HTMLElement>,
  api: ListboxApi,
) {
  const option = currentOption(event);
  if (!option) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    openOption(event, option, api);
    return;
  }
  if (hasCommandModifier(event) || event.altKey) return;
  const step = MOVES[event.key];
  const expanded = EXPAND_KEYS[event.key];
  if (step !== undefined) moveFocus(event.currentTarget, option, step);
  else if (expanded !== undefined) toggleIfExpanded(option, expanded);
  else return;
  event.preventDefault();
}
