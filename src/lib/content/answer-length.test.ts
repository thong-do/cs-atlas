import { describe, expect, it } from 'vitest'
import { answerLengthViolations } from './answer-length'

/** A question whose right answer has `rank` strictly longer choices among distinct lengths 1–4. */
const ranked = (rank: number) => ({ choices: ['a', 'aa', 'aaa', 'aaaa'], answer: 3 - rank })
const ofRanks = (...ranks: number[]) => ranks.map(ranked)

describe('answerLengthViolations', () => {
  it('does not apply below 4 questions whose choices differ in length', () => {
    expect(answerLengthViolations(ofRanks(1, 1, 1))).toEqual([])
    const same = { choices: ['aa', 'bb', 'cc'], answer: 1 }
    expect(answerLengthViolations([same, same, same, same, same, ...ofRanks(1, 1, 1)])).toEqual([])
    expect(answerLengthViolations([])).toEqual([])
  })
  it('leaves same-length questions out of n', () => {
    const same = { choices: ['aa', 'bb', 'cc'], answer: 1 }
    // n is 5 here, so one extreme is enough, however many same-length questions there are.
    expect(answerLengthViolations([same, same, same, same, same, same, ...ofRanks(0, 1, 1, 2, 2)])).toEqual([])
  })
  it('rule (a): needs ceil(n / 5) extremes', () => {
    expect(answerLengthViolations(ofRanks(1, 1, 2, 2))[0]).toContain('rule (a)')
    expect(answerLengthViolations(ofRanks(0, 1, 1, 2))).toEqual([])
    expect(answerLengthViolations(ofRanks(1, 1, 1, 2, 2))[0]).toContain('rule (a)')
    expect(answerLengthViolations(ofRanks(3, 1, 1, 2, 2))).toEqual([])
    // n = 6 needs 2.
    expect(answerLengthViolations(ofRanks(0, 1, 1, 1, 2, 2))[0]).toContain('rule (a)')
    expect(answerLengthViolations(ofRanks(0, 3, 1, 1, 2, 2))).toEqual([])
  })
  it('counts a tie with the longest or shortest choice as an extreme', () => {
    const tiedLong = { choices: ['a', 'aa', 'aaaa', 'bbbb'], answer: 2 }
    const tiedShort = { choices: ['a', 'b', 'aa', 'aaaa'], answer: 0 }
    expect(answerLengthViolations([tiedLong, ...ofRanks(1, 1, 2, 2)])).toEqual([])
    expect(answerLengthViolations([tiedShort, ...ofRanks(1, 1, 2, 2)])).toEqual([])
  })
  it('rule (b): no rank may hold more than 60% of n', () => {
    expect(answerLengthViolations(ofRanks(0, 1, 1, 1, 2))).toEqual([])
    const fourOfFive = answerLengthViolations(ofRanks(0, 1, 1, 1, 1))
    expect(fourOfFive).toHaveLength(1)
    expect(fourOfFive[0]).toContain('rule (b)')
    const sevenOfTwelve = [...Array(7).fill(1), 0, 3, 3, 2, 2] as number[]
    expect(answerLengthViolations(ofRanks(...sevenOfTwelve))).toEqual([])
    const eightOfTwelve = [...Array(8).fill(1), 0, 3, 3, 2] as number[]
    expect(answerLengthViolations(ofRanks(...eightOfTwelve))[0]).toContain('rule (b)')
  })
  it('counts an all-extreme rank against rule (b) too', () => {
    expect(answerLengthViolations(ofRanks(0, 0, 0, 0, 1))[0]).toContain('rule (b)')
  })
  it('reports both rules when both fail', () => {
    const errors = answerLengthViolations(ofRanks(1, 1, 1, 1, 2))
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('rule (a)')
    expect(errors[1]).toContain('rule (b)')
  })
  it('skips a question whose answer is not one of its choices', () => {
    expect(answerLengthViolations([{ choices: ['a', 'aa'], answer: 9 }, ...ofRanks(1, 2, 1)])).toEqual([])
  })
})
