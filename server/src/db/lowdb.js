import { JSONFilePreset } from 'lowdb/node'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedData } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data.json')

const DEFAULTS = {
  organizations: [],
  users: [],
  categories: [],
  products: [],
  employees: [],
  rooms: [],
  transactions: [],
  assignments: [],
  notifications: [],
}

function defaultRooms(orgId) {
  if (!orgId) return []
  const now = new Date().toISOString()
  return [
    { id: `room_${orgId}_101`, orgId, number: '101', name: '101-xona · Ombor', building: 'Asosiy bino', floor: '1', createdAt: now },
    { id: `room_${orgId}_201`, orgId, number: '201', name: '201-xona · O\'quv xonasi', building: 'Asosiy bino', floor: '2', createdAt: now },
    { id: `room_${orgId}_204`, orgId, number: '204', name: '204-xona · Kompyuter xonasi', building: 'Asosiy bino', floor: '2', createdAt: now },
    { id: `room_${orgId}_305`, orgId, number: '305', name: '305-xona · Ma\'muriyat', building: 'Asosiy bino', floor: '3', createdAt: now },
  ]
}

function migrate(data) {
  let changed = false
  if (!Array.isArray(data.rooms)) {
    data.rooms = []
    changed = true
  }
  for (const org of data.organizations || []) {
    if (org?.id && !data.rooms.some((r) => r.orgId === org.id)) {
      data.rooms.push(...defaultRooms(org.id))
      changed = true
    }
  }
  for (const a of data.assignments || []) {
    if (!a.targetType) {
      a.targetType = a.roomId ? 'room' : 'employee'
      changed = true
    }
    if (a.roomId === undefined) {
      a.roomId = null
      changed = true
    }
  }
  return changed
}

const db = await JSONFilePreset(DATA_FILE, DEFAULTS)

if (!db.data.organizations.length) {
  db.data = seedData()
  await db.write()
  console.log('[db] Demo ma\'lumotlar bilan boshlang\'ich baza yaratildi:', DATA_FILE)
} else if (migrate(db.data)) {
  await db.write()
}

// Simple async mutex so concurrent requests never interleave db.write() calls
// and corrupt the JSON file — Node itself is single-threaded between awaits,
// so mutating db.data is safe; only the file write needs serializing.
let queue = Promise.resolve()

export function mutate(fn) {
  const run = queue.then(async () => {
    const result = await fn(db.data)
    await db.write()
    return result
  })
  // keep the queue alive even if this mutation rejects
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function getData() {
  return db.data
}

export default db
