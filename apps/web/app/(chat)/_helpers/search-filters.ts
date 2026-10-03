import { AtSign, File, Hash, Link2, Paperclip, UserRound } from 'lucide-react';
import type { SearchFilterKey } from './parse-search-query';

export const SEARCH_FILTERS: {
  key: SearchFilterKey;
  label: string;
  hint: string;
  icon: typeof UserRound;
}[] = [
  {
    key: 'from',
    label: 'From a specific user',
    hint: 'from: user',
    icon: UserRound,
  },
  {
    key: 'in',
    label: 'Sent in a specific channel',
    hint: 'in: channel',
    icon: Hash,
  },
  {
    key: 'has',
    label: 'Includes a specific type of data',
    hint: 'has: link, embed or file',
    icon: Paperclip,
  },
  {
    key: 'mentions',
    label: 'Mentions a specific user',
    hint: 'mentions: user',
    icon: AtSign,
  },
];

export const SEARCH_HAS_OPTIONS = [
  { value: 'file', label: 'File', icon: File },
  { value: 'link', label: 'Link', icon: Link2 },
] as const;
