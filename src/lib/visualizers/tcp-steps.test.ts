import { describe, expect, it } from 'vitest'
import { tcpHandshakeSteps, type TcpSegment } from './tcp-steps'

const seg = (from: 'client' | 'server', flags: TcpSegment['flags'], seq: number, ack: number | null, len: number, extra: Partial<TcpSegment> = {}): TcpSegment => ({ from, flags, seq, ack, len, ...extra })

// client, server, segment, [sent, lost, retransmits, delivered], caption
const EXPECTED: [string, string, TcpSegment | null, number[], string][] = [
  ['CLOSED', 'LISTEN', null, [0, 0, 0, 0], 'The server was listening; the client was closed'],
  ['SYN_SENT', 'LISTEN', seg('client', ['SYN'], 100, null, 0), [1, 0, 0, 0], 'The client sent SYN with seq = 100'],
  ['SYN_SENT', 'SYN_RECEIVED', seg('server', ['SYN', 'ACK'], 300, 101, 0), [2, 0, 0, 0], 'The server replied SYN-ACK with seq = 300 and ack = 100 + 1 = 101'],
  ['ESTABLISHED', 'ESTABLISHED', seg('client', ['ACK'], 101, 301, 0), [3, 0, 0, 0], 'The client acked with ack = 300 + 1 = 301, and both sides were established'],
  ['ESTABLISHED', 'ESTABLISHED', seg('client', ['ACK'], 101, 301, 100), [4, 0, 0, 100], 'The client sent 100 bytes with seq = 101'],
  ['ESTABLISHED', 'ESTABLISHED', seg('server', ['ACK'], 301, 201, 0), [5, 0, 0, 100], 'The server acked with ack = 101 + 100 = 201'],
  ['ESTABLISHED', 'ESTABLISHED', seg('client', ['ACK'], 201, 301, 100, { lost: true }), [6, 1, 0, 100], 'The client sent 100 bytes with seq = 201, and the segment was lost'],
  ['ESTABLISHED', 'ESTABLISHED', null, [6, 1, 0, 100], "No ACK arrived, so the client's retransmission timer expired"],
  ['ESTABLISHED', 'ESTABLISHED', seg('client', ['ACK'], 201, 301, 100, { retransmit: true }), [7, 1, 1, 200], 'The client resent the 100 bytes with seq = 201'],
  ['ESTABLISHED', 'ESTABLISHED', seg('server', ['ACK'], 301, 301, 0), [8, 1, 1, 200], 'The server acked with ack = 201 + 100 = 301'],
  ['FIN_WAIT_1', 'ESTABLISHED', seg('client', ['FIN', 'ACK'], 301, 301, 0), [9, 1, 1, 200], 'The client sent FIN with seq = 301 to close its side'],
  ['FIN_WAIT_2', 'CLOSE_WAIT', seg('server', ['ACK'], 301, 302, 0), [10, 1, 1, 200], 'The server acked the FIN with ack = 301 + 1 = 302'],
  ['FIN_WAIT_2', 'LAST_ACK', seg('server', ['FIN', 'ACK'], 301, 302, 0), [11, 1, 1, 200], 'The server sent its own FIN with seq = 301'],
  ['TIME_WAIT', 'CLOSED', seg('client', ['ACK'], 302, 302, 0), [12, 1, 1, 200], 'The client acked with ack = 302 and waited in TIME_WAIT; the server closed'],
  ['TIME_WAIT', 'CLOSED', null, [12, 1, 1, 200], 'Done: 200 bytes arrived; 12 segments were sent and the 1 lost one was resent after a timeout'],
]

describe('tcpHandshakeSteps', () => {
  const steps = tcpHandshakeSteps()

  it('has 15 steps with one done step', () => {
    expect(steps).toHaveLength(15)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[14].done).toBe(true)
  })

  it('pins states, segment and counters at every step', () => {
    expect(steps.map((s) => [s.client, s.server, s.segment, [s.sent, s.lost, s.retransmits, s.delivered]])).toEqual(EXPECTED.map((e) => e.slice(0, 4)))
  })

  it('writes the captions', () => {
    expect(steps.map((s) => s.caption)).toEqual(EXPECTED.map((e) => e[4]))
  })
})
