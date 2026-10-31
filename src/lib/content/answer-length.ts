/** The parts of a quiz question that V16 reads. */
export interface AnswerLengthQuestion { choices: string[]; answer: number }

/** Below this many questions with differing choice lengths, V16 doesn't apply. */
const MIN_QUESTIONS = 4

/**
 * V16: the right answer's length must not give it away across a file.
 * A question counts only if its choices differ in length. Its rank is how many choices are
 * strictly longer than the right answer; it is an extreme if no choice is longer or no choice is shorter.
 * Returns one message per failed rule. A bad `answer` index is V12's or V14's to report, so it is skipped here.
 */
export function answerLengthViolations(questions: AnswerLengthQuestion[]): string[] {
  const counted = questions.filter((q) => q.choices[q.answer] !== undefined && new Set(q.choices.map((c) => c.length)).size > 1)
  const n = counted.length
  if (n < MIN_QUESTIONS) return []

  let extremes = 0
  const ranks = new Map<number, number>()
  for (const q of counted) {
    const lengths = q.choices.map((c) => c.length)
    const right = lengths[q.answer]
    const rank = lengths.filter((l) => l > right).length
    ranks.set(rank, (ranks.get(rank) ?? 0) + 1)
    if (right === Math.max(...lengths) || right === Math.min(...lengths)) extremes++
  }

  const errors: string[] = []
  const minExtremes = Math.ceil(n / 5)
  if (extremes < minExtremes) {
    errors.push(`rule (a): the right answer is the longest or shortest choice in ${extremes} of ${n} questions; it must be in at least ${minExtremes}`)
  }
  const maxPerRank = Math.floor((n * 3) / 5)
  for (const [rank, count] of [...ranks].sort(([a], [b]) => a - b)) {
    if (count > maxPerRank) {
      errors.push(`rule (b): the right answer has ${rank} longer choice(s) in ${count} of ${n} questions; at most ${maxPerRank} may share a rank`)
    }
  }
  return errors
}
