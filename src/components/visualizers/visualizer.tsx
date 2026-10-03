'use client'

import { useMemo } from 'react'
import { binarySearchSteps, gridBfsSteps, slidingWindowSteps, twoPointersSteps } from '@/lib/visualizers/steps'
import { StepPlayer } from './step-player'
import { VisStepView } from './step-views'

const EXAMPLES = {
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

export type VisualizerKind = keyof typeof EXAMPLES

export function Visualizer({ kind }: { kind: VisualizerKind }) {
  const example = EXAMPLES[kind]
  const steps = useMemo(() => example.build(), [example])
  return <StepPlayer steps={steps} title={example.title} render={(s) => <VisStepView step={s} />} />
}
