import { ObjectWithId } from './object-with-id'

export const MATCH_NONE = 0
export const MATCH_ANY = 1
export const MATCH_ALL = 2
export const MATCH_LITERAL = 3
export const MATCH_REGEX = 4
export const MATCH_FUZZY = 5
export const MATCH_AUTO = 6
export const DEFAULT_MATCHING_ALGORITHM = MATCH_AUTO

export const MATCHING_ALGORITHMS = [
  {
    id: MATCH_AUTO,
    shortName: 'Automatic',
    name: 'Auto: Learn matching automatically',
  },
  {
    id: MATCH_ANY,
    shortName: 'Any word',
    name: 'Any: Document contains any of these words (space separated)',
  },
  {
    id: MATCH_ALL,
    shortName: 'All words',
    name: 'All: Document contains all of these words (space separated)',
  },
  {
    id: MATCH_LITERAL,
    shortName: 'Exact match',
    name: 'Exact: Document contains this string',
  },
  {
    id: MATCH_REGEX,
    shortName: 'Regular expression',
    name: 'Regular expression: Document matches this regular expression',
  },
  {
    id: MATCH_FUZZY,
    shortName: 'Fuzzy word',
    name: 'Fuzzy: Document contains a word similar to this word',
  },
  {
    id: MATCH_NONE,
    shortName: 'None',
    name: 'None: Disable matching',
  },
]

export interface MatchingModel extends ObjectWithId {
  name?: string

  slug?: string

  match?: string

  matching_algorithm?: number

  is_insensitive?: boolean

  document_count?: number
}
