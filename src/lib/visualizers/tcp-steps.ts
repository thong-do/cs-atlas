export type Side = 'client' | 'server'
export type TcpState =
  | 'CLOSED' | 'LISTEN' | 'SYN_SENT' | 'SYN_RECEIVED' | 'ESTABLISHED'
  | 'FIN_WAIT_1' | 'FIN_WAIT_2' | 'CLOSE_WAIT' | 'LAST_ACK' | 'TIME_WAIT'
export interface TcpSegment {
  from: Side
  flags: ('SYN' | 'ACK' | 'FIN')[]
  seq: number
  ack: number | null
  len: number
  lost?: true
  retransmit?: true
}
export interface TcpStep {
  client: TcpState
  server: TcpState
  segment: TcpSegment | null
  sent: number
  lost: number
  retransmits: number
  delivered: number
  caption: string
  done?: boolean
}

export const CLIENT_ISN = 100
export const SERVER_ISN = 300
const SEGMENT_BYTES = 100

const other = (s: Side): Side => (s === 'client' ? 'server' : 'client')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export function tcpHandshakeSteps(): TcpStep[] {
  const steps: TcpStep[] = []
  let client: TcpState = 'CLOSED'
  let server: TcpState = 'LISTEN'
  let sent = 0
  let lost = 0
  let retransmits = 0
  let delivered = 0
  // Next sequence number each side will send, and next byte each side expects to receive.
  const sndNxt: Record<Side, number> = { client: CLIENT_ISN, server: SERVER_ISN }
  const rcvNxt: Record<Side, number> = { client: 0, server: 0 }

  const push = (segment: TcpSegment | null, caption: string, done?: boolean) => {
    steps.push({ client, server, segment, sent, lost, retransmits, delivered, caption, ...(done ? { done: true } : {}) })
  }

  /** Send a new segment: seq is the sender's sndNxt; the receiver acks its own next expected byte. */
  function send(from: Side, flags: TcpSegment['flags'], len: number, opts: { lose?: boolean } = {}): TcpSegment {
    const to = other(from)
    const seq = sndNxt[from]
    const ack = flags.includes('ACK') ? rcvNxt[from] : null
    if (ack !== null && ack > sndNxt[to]) throw new Error(`${from} acked ${ack}, but ${to} has only sent up to ${sndNxt[to]}`)
    const segment: TcpSegment = { from, flags, seq, ack, len, ...(opts.lose ? { lost: true as const } : {}) }
    sndNxt[from] += len + (flags.includes('SYN') ? 1 : 0) + (flags.includes('FIN') ? 1 : 0)
    sent++
    if (opts.lose) lost++
    else receive(segment)
    return segment
  }

  function receive(s: TcpSegment) {
    const to = other(s.from)
    if (s.seq !== rcvNxt[to] && !s.flags.includes('SYN')) throw new Error(`${to} expected seq ${rcvNxt[to]} but got ${s.seq}`)
    rcvNxt[to] = s.seq + s.len + (s.flags.includes('SYN') ? 1 : 0) + (s.flags.includes('FIN') ? 1 : 0)
    if (to === 'server') delivered += s.len
  }

  function resend(original: TcpSegment): TcpSegment {
    const segment: TcpSegment = { ...original, ack: rcvNxt[original.from], retransmit: true }
    delete segment.lost
    if (segment.seq !== rcvNxt[other(segment.from)]) throw new Error('a retransmission must reuse the original seq')
    sent++
    retransmits++
    receive(segment)
    return segment
  }

  push(null, 'The server was listening; the client was closed')

  client = 'SYN_SENT'
  const syn = send('client', ['SYN'], 0)
  push(syn, `The client sent SYN with seq = ${syn.seq}`)

  server = 'SYN_RECEIVED'
  const synAck = send('server', ['SYN', 'ACK'], 0)
  push(synAck, `The server replied SYN-ACK with seq = ${synAck.seq} and ack = ${syn.seq} + 1 = ${synAck.ack}`)

  client = 'ESTABLISHED'
  server = 'ESTABLISHED'
  const hsAck = send('client', ['ACK'], 0)
  push(hsAck, `The client acked with ack = ${synAck.seq} + 1 = ${hsAck.ack}, and both sides were established`)

  const d1 = send('client', ['ACK'], SEGMENT_BYTES)
  push(d1, `The client sent ${d1.len} bytes with seq = ${d1.seq}`)
  const a1 = send('server', ['ACK'], 0)
  push(a1, `The server acked with ack = ${d1.seq} + ${d1.len} = ${a1.ack}`)

  const d2 = send('client', ['ACK'], SEGMENT_BYTES, { lose: true })
  push(d2, `The client sent ${d2.len} bytes with seq = ${d2.seq}, and the segment was lost`)
  push(null, "No ACK arrived, so the client's retransmission timer expired")
  const d2r = resend(d2)
  push(d2r, `The client resent the ${d2r.len} bytes with seq = ${d2r.seq}`)
  const a2 = send('server', ['ACK'], 0)
  push(a2, `The server acked with ack = ${d2r.seq} + ${d2r.len} = ${a2.ack}`)

  client = 'FIN_WAIT_1'
  const fin = send('client', ['FIN', 'ACK'], 0)
  push(fin, `The client sent FIN with seq = ${fin.seq} to close its side`)

  client = 'FIN_WAIT_2'
  server = 'CLOSE_WAIT'
  const finAck = send('server', ['ACK'], 0)
  push(finAck, `The server acked the FIN with ack = ${fin.seq} + 1 = ${finAck.ack}`)

  server = 'LAST_ACK'
  const fin2 = send('server', ['FIN', 'ACK'], 0)
  push(fin2, `The server sent its own FIN with seq = ${fin2.seq}`)

  client = 'TIME_WAIT'
  server = 'CLOSED'
  const last = send('client', ['ACK'], 0)
  push(last, `The client acked with ack = ${last.ack} and waited in TIME_WAIT; the server closed`)

  push(
    null,
    `Done: ${delivered} bytes arrived; ${sent} ${plural(sent, 'segment was', 'segments were')} sent and the ${lost} lost ${plural(lost, 'one was', 'ones were')} resent after a timeout`,
    true,
  )
  return steps
}
