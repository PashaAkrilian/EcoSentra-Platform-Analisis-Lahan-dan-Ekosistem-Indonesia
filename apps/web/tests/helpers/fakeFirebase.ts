import { Timestamp } from "firebase-admin/firestore"

/**
 * Firestore & Auth palsu in-memory untuk test API routes — hanya subset API
 * yang benar-benar dipakai server/* (collection/doc/where/orderBy/limit/add/
 * update/delete/set/batch). Dipasang lewat vi.mock("@/server/firebaseAdmin").
 */

const SERVER_TIMESTAMP = Symbol("serverTimestamp")
let clock = Date.parse("2026-10-05T00:00:00.000Z")

function resolveSentinels(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === SERVER_TIMESTAMP ? Timestamp.fromMillis((clock += 1000)) : v]),
  )
}

type Doc = Record<string, unknown>

export class FakeDb {
  collections = new Map<string, Map<string, Doc>>()
  private nextId = 1

  store(name: string) {
    if (!this.collections.has(name)) this.collections.set(name, new Map())
    return this.collections.get(name)!
  }

  collection(name: string) {
    return new FakeQuery(this, name)
  }

  batch() {
    const ops: (() => Promise<void>)[] = []
    return {
      delete: (ref: FakeDocRef) => ops.push(() => ref.delete()),
      commit: async () => {
        for (const op of ops) await op()
      },
    }
  }

  newId() {
    return `doc${this.nextId++}`
  }

  reset() {
    this.collections.clear()
    this.nextId = 1
  }
}

export class FakeDocRef {
  constructor(
    private db: FakeDb,
    private collectionName: string,
    readonly id: string,
  ) {}

  async get() {
    const data = this.db.store(this.collectionName).get(this.id)
    return new FakeDocSnap(this, data)
  }

  async set(data: Doc, options?: { merge?: boolean }) {
    const store = this.db.store(this.collectionName)
    const base = options?.merge ? (store.get(this.id) ?? {}) : {}
    store.set(this.id, { ...base, ...resolveSentinels(data) })
  }

  async update(data: Doc) {
    const store = this.db.store(this.collectionName)
    const existing = store.get(this.id)
    if (!existing) throw new Error(`NOT_FOUND: ${this.collectionName}/${this.id}`)
    store.set(this.id, { ...existing, ...resolveSentinels(data) })
  }

  async delete() {
    this.db.store(this.collectionName).delete(this.id)
  }
}

export class FakeDocSnap {
  constructor(
    readonly ref: FakeDocRef,
    private value: Doc | undefined,
  ) {}

  get id() {
    return this.ref.id
  }

  get exists() {
    return this.value !== undefined
  }

  data() {
    return this.value ? { ...this.value } : undefined
  }

  get(field: string) {
    return this.value?.[field]
  }
}

class FakeQuery {
  constructor(
    private db: FakeDb,
    private collectionName: string,
    private filters: [string, unknown][] = [],
    private order: [string, "asc" | "desc"] | null = null,
    private max = Infinity,
  ) {}

  doc(id: string) {
    return new FakeDocRef(this.db, this.collectionName, id)
  }

  async add(data: Doc) {
    const ref = this.doc(this.db.newId())
    await ref.set(data)
    return ref
  }

  where(field: string, op: string, value: unknown) {
    if (op !== "==") throw new Error(`FakeQuery hanya mendukung '==' (diminta '${op}')`)
    return new FakeQuery(this.db, this.collectionName, [...this.filters, [field, value]], this.order, this.max)
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    return new FakeQuery(this.db, this.collectionName, this.filters, [field, direction], this.max)
  }

  limit(n: number) {
    return new FakeQuery(this.db, this.collectionName, this.filters, this.order, n)
  }

  async get() {
    let entries = [...this.db.store(this.collectionName).entries()].filter(([, data]) =>
      this.filters.every(([field, value]) => data[field] === value),
    )
    if (this.order) {
      const [field, direction] = this.order
      entries = entries.sort(([, a], [, b]) => {
        const cmp = (a[field] as Timestamp).toMillis() - (b[field] as Timestamp).toMillis()
        return direction === "asc" ? cmp : -cmp
      })
    }
    const docs = entries.slice(0, this.max).map(([id, data]) => new FakeDocSnap(this.doc(id), { ...data }))
    return { docs, empty: docs.length === 0 }
  }
}

export const TOKENS: Record<string, { uid: string; email: string; name?: string; admin?: boolean }> = {
  "token-alice": { uid: "alice", email: "alice@example.com" },
  "token-bob": { uid: "bob", email: "bob@example.com" },
  "token-carol": { uid: "carol", email: "carol@example.com", name: "Carol Dewi" },
  "token-admin": { uid: "admin", email: "admin@example.com", admin: true },
}

export const fakeAuth = {
  deletedUids: [] as string[],
  async verifyIdToken(token: string) {
    const claims = TOKENS[token]
    if (!claims) throw new Error("auth/argument-error")
    return claims
  },
  async deleteUser(uid: string) {
    this.deletedUids.push(uid)
  },
}

export const fakeDb = new FakeDb()

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase belum dikonfigurasi di server (lihat apps/web/.env.local.example).")
    this.name = "FirebaseNotConfiguredError"
  }
}

export const firebaseState = { configured: true }

/** Factory untuk vi.mock("@/server/firebaseAdmin", ...). */
export function fakeFirebaseAdminModule() {
  const ensureConfigured = () => {
    if (!firebaseState.configured) throw new FirebaseNotConfiguredError()
  }
  return {
    FirebaseNotConfiguredError,
    isFirebaseAdminConfigured: () => firebaseState.configured,
    getDb: () => {
      ensureConfigured()
      return fakeDb
    },
    getAdminAuth: () => {
      ensureConfigured()
      return fakeAuth
    },
    FieldValue: { serverTimestamp: () => SERVER_TIMESTAMP },
  }
}

/** Buat Request dengan token & body JSON opsional. */
export function apiRequest(
  path: string,
  { token, method = "GET", body }: { token?: string; method?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` }
  if (token) headers.authorization = `Bearer ${token}`
  if (body !== undefined) headers["content-type"] = "application/json"
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  })
}

export const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) })
