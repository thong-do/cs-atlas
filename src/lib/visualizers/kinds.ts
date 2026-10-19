/** Every `<Visualizer kind="…">` value. React-free so the content validator can import it. */
export const VISUALIZER_KINDS = [
  'two-pointers',
  'sliding-window',
  'binary-search',
  'grid-bfs',
  'heap',
  'lcs-table',
  'house-robber',
  'subsets-tree',
  'cache-lru',
  'dns-resolution',
  'load-balancer',
  'consistent-hashing',
  'token-bucket',
  'feed-fanout',
  'raft',
  'two-phase-commit',
  'page-table',
  'mutex',
  'tcp-handshake',
] as const

export type VisualizerKind = (typeof VISUALIZER_KINDS)[number]
