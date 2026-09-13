import { Router } from 'express'
import { nanoid } from 'nanoid'
import { getData } from '../db/lowdb.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Pairing sessions live only in memory — they are short-lived hand-off
// tokens between a desktop tab and a phone camera, not durable data.
const TTL_MS = 5 * 60 * 1000
const CONNECTED_TTL_MS = 15 * 60 * 1000
const sessions = new Map()

function sseSend(res, event, data) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function broadcast(session, event, data) {
  for (const res of session.clients) {
    try {
      sseSend(res, event, data)
    } catch {
      /* client pipe already gone */
    }
  }
}

function closeSession(session) {
  broadcast(session, 'closed', {})
  for (const res of session.clients) {
    try {
      res.end()
    } catch {
      /* already closed */
    }
  }
  sessions.delete(session.id)
}

setInterval(() => {
  const now = Date.now()
  for (const session of sessions.values()) {
    if (session.expiresAt < now) closeSession(session)
  }
}, 15_000).unref()

router.post('/', requireAuth, (req, res) => {
  const org = getData().organizations.find((o) => o.id === req.orgId)
  const now = Date.now()
  const session = {
    id: nanoid(21),
    orgId: req.orgId,
    orgName: org?.name || '',
    createdAt: now,
    expiresAt: now + TTL_MS,
    connected: false,
    clients: new Set(),
  }
  sessions.set(session.id, session)
  res.status(201).json({ id: session.id, expiresAt: session.expiresAt })
})

router.get('/:id', (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session || session.expiresAt < Date.now()) {
    return res.status(404).json({ error: "Sessiya topilmadi yoki muddati tugagan" })
  }
  res.json({ valid: true, orgName: session.orgName, connected: session.connected, expiresAt: session.expiresAt })
})

router.get('/:id/stream', (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session || session.expiresAt < Date.now()) {
    return res.status(404).json({ error: "Sessiya topilmadi yoki muddati tugagan" })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('\n')
  session.clients.add(res)
  sseSend(res, 'ready', { connected: session.connected })

  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      /* ignore */
    }
  }, 20_000)

  req.on('close', () => {
    clearInterval(ping)
    session.clients.delete(res)
  })
})

router.post('/:id/code', (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session || session.expiresAt < Date.now()) {
    return res.status(404).json({ error: "Sessiya topilmadi yoki muddati tugagan" })
  }
  const code = String(req.body?.code || '').trim()
  if (!code) return res.status(400).json({ error: "Kod bo'sh" })

  const firstJoin = !session.connected
  session.connected = true
  session.expiresAt = Date.now() + CONNECTED_TTL_MS

  if (firstJoin) broadcast(session, 'connected', {})
  broadcast(session, 'code', { code, at: Date.now() })

  res.json({ ok: true })
})

router.delete('/:id', requireAuth, (req, res) => {
  const session = sessions.get(req.params.id)
  if (session) closeSession(session)
  res.status(204).end()
})

export default router
