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
] as const

export type VisualizerKind = (typeof VISUALIZER_KINDS)[number]
