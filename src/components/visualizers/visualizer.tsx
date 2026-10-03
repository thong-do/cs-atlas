'use client'

import { useMemo } from 'react'
import { binarySearchSteps, slidingWindowSteps, twoPointersSteps } from '@/lib/visualizers/steps'
import { StepPlayer } from './step-player'

const EXAMPLES = {
  'two-pointers': { title: 'Find two numbers summing to 10 in [1, 3, 4, 6, 8, 11]', build: () => twoPointersSteps([1, 3, 4, 6, 8, 11], 10) },
  'sliding-window': { title: 'Longest substring without repeats in "abcabcbb"', build: () => slidingWindowSteps('abcabcbb') },
  'binary-search': { title: 'Find 9 in [1, 3, 5, 7, 9, 11, 13]', build: () => binarySearchSteps([1, 3, 5, 7, 9, 11, 13], 9) },
} as const

export type VisualizerKind = keyof typeof EXAMPLES

export function Visualizer({ kind }: { kind: VisualizerKind }) {
  const example = EXAMPLES[kind]
  const steps = useMemo(() => example.build(), [example])
  return <StepPlayer steps={steps} title={example.title} />
}
