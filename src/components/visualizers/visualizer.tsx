'use client'

import { useMemo } from 'react'
import { VISUALIZER_KINDS, type VisualizerKind } from '@/lib/visualizers/kinds'
import { binarySearchSteps, gridBfsSteps, slidingWindowSteps, twoPointersSteps } from '@/lib/visualizers/steps'
import { lruCacheSteps } from '@/lib/visualizers/cache-steps'
import { heapSteps } from '@/lib/visualizers/heap-steps'
import { houseRobberSteps, lcsTableSteps } from '@/lib/visualizers/table-steps'
import { subsetsTreeSteps } from '@/lib/visualizers/tree-steps'
import { CacheView } from './cache-view'
import { HeapView } from './heap-view'
import { TableView } from './table-view'
import { TreeView } from './tree-view'
import { StepPlayer } from './step-player'
import { VisStepView } from './step-views'

const ARRAY_EXAMPLES = {
  'two-pointers': { title: 'Find two numbers summing to 10 in [1, 3, 4, 6, 8, 11]', build: () => twoPointersSteps([1, 3, 4, 6, 8, 11], 10) },
  'sliding-window': { title: 'Longest substring without repeats in "abcabcbb"', build: () => slidingWindowSteps('abcabcbb') },
  'binary-search': { title: 'Find 9 in [1, 3, 5, 7, 9, 11, 13]', build: () => binarySearchSteps([1, 3, 5, 7, 9, 11, 13], 9) },
  'grid-bfs': {
    title: 'BFS flood fill from the top-left land cell',
    build: () =>
      gridBfsSteps(
        [
          ['1', '1', '0', '0'],
          ['1', '0', '0', '1'],
          ['1', '1', '0', '1'],
          ['0', '1', '1', '1'],
        ],
        [0, 0],
      ),
  },
} as const

export type { VisualizerKind }

const isArrayKind = (kind: string): kind is keyof typeof ARRAY_EXAMPLES => Object.hasOwn(ARRAY_EXAMPLES, kind)

function ArrayVisualizer({ kind }: { kind: keyof typeof ARRAY_EXAMPLES }) {
  const example = ARRAY_EXAMPLES[kind]
  const steps = useMemo(() => example.build(), [example])
  return <StepPlayer steps={steps} title={example.title} render={(s) => <VisStepView step={s} />} />
}

function HeapVisualizer() {
  const steps = useMemo(() => heapSteps([{ push: 5 }, { push: 3 }, { push: 8 }, { push: 1 }, { push: 4 }, 'pop', 'pop']), [])
  const maxSize = Math.max(...steps.map((s) => s.heap.length))
  return <StepPlayer steps={steps} title="Min-heap: push 5, 3, 8, 1, 4, then pop twice" render={(s) => <HeapView step={s} maxSize={maxSize} />} />
}

function LcsVisualizer() {
  const steps = useMemo(() => lcsTableSteps('ace', 'abcde'), [])
  return <StepPlayer steps={steps} title={'Longest Common Subsequence of "ace" and "abcde"'} render={(s) => <TableView step={s} />} />
}

function HouseRobberVisualizer() {
  const steps = useMemo(() => houseRobberSteps([2, 7, 9, 3, 1]), [])
  return <StepPlayer steps={steps} title="House Robber on [2, 7, 9, 3, 1]" render={(s) => <TableView step={s} />} />
}

function SubsetsVisualizer() {
  const steps = useMemo(() => subsetsTreeSteps([1, 2, 3]), [])
  return <StepPlayer steps={steps} title="Subsets of [1, 2, 3] — the decision tree" render={(s) => <TreeView step={s} finalResults={steps.at(-1)!.results} />} />
}

function CacheVisualizer() {
  const steps = useMemo(() => lruCacheSteps(3, ['A', 'B', 'C', 'A', 'D', 'B', 'E', 'A']), [])
  return <StepPlayer steps={steps} title="LRU cache with room for 3: read A B C A D B E A" render={(s) => <CacheView step={s} />} />
}

export function Visualizer({ kind }: { kind: VisualizerKind }) {
  switch (kind) {
    case 'heap':
      return <HeapVisualizer />
    case 'lcs-table':
      return <LcsVisualizer />
    case 'house-robber':
      return <HouseRobberVisualizer />
    case 'subsets-tree':
      return <SubsetsVisualizer />
    case 'cache-lru':
      return <CacheVisualizer />
    default:
      if (isArrayKind(kind)) return <ArrayVisualizer kind={kind} />
      throw new Error(`Unknown <Visualizer kind="${kind}">. Valid kinds: ${VISUALIZER_KINDS.join(', ')}`)
  }
}
