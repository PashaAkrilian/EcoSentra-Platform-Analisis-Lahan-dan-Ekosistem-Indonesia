import "server-only"
import { Timestamp, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore"
import { FieldValue, getDb } from "@/server/firebaseAdmin"
import { HttpError } from "@/server/http"

/**
 * Akses Firestore untuk dokumen milik user. Semua koleksi user menyimpan
 * `userId` (uid Firebase Auth) dan hanya bisa dibaca/diubah pemiliknya —
 * dokumen milik orang lain diperlakukan seperti tidak ada (404, bukan 403,
 * supaya keberadaan dokumen tidak bocor).
 *
 * Firestore diakses lewat Admin SDK (bypass Security Rules), jadi
 * pengecekan kepemilikan di sini adalah kontrol akses utamanya —
 * firestore.rules sendiri menolak semua akses langsung dari klien.
 */

export type OwnedCollection = "fields" | "landCoverSnapshots" | "decisions"

const LIST_LIMIT = 200

/** Ubah Timestamp Firestore (termasuk yang bersarang) jadi string ISO 8601. */
export function serializeValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serializeValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializeValue(v)]))
  }
  return value
}

export function serializeDoc<T>(doc: DocumentSnapshot<DocumentData>): T {
  const { userId: _userId, ...data } = doc.data() ?? {}
  return { id: doc.id, ...(serializeValue(data) as object) } as T
}

function byNewest(a: { createdAt?: unknown }, b: { createdAt?: unknown }) {
  return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
}

/**
 * Daftar dokumen milik user, terbaru dulu. Diurutkan di memori (bukan
 * orderBy di query) supaya tidak butuh composite index Firestore.
 */
export async function listOwned<T extends { createdAt?: unknown }>(
  collection: OwnedCollection,
  uid: string,
  filters: Record<string, string> = {},
): Promise<T[]> {
  let query = getDb().collection(collection).where("userId", "==", uid)
  for (const [field, value] of Object.entries(filters)) {
    query = query.where(field, "==", value)
  }
  const snapshot = await query.limit(LIST_LIMIT).get()
  return snapshot.docs.map((doc) => serializeDoc<T>(doc)).sort(byNewest)
}

export async function getOwnedSnapshot(collection: OwnedCollection, id: string, uid: string) {
  if (!id || id.length > 200 || id.includes("/")) {
    throw new HttpError(404, "Data tidak ditemukan.")
  }
  const doc = await getDb().collection(collection).doc(id).get()
  if (!doc.exists || doc.get("userId") !== uid) {
    throw new HttpError(404, "Data tidak ditemukan.")
  }
  return doc
}

export async function getOwned<T>(collection: OwnedCollection, id: string, uid: string): Promise<T> {
  return serializeDoc<T>(await getOwnedSnapshot(collection, id, uid))
}

export async function createOwned<T>(collection: OwnedCollection, uid: string, data: object): Promise<T> {
  const ref = await getDb()
    .collection(collection)
    .add({
      ...data,
      userId: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  return serializeDoc<T>(await ref.get())
}

export async function updateOwned<T>(collection: OwnedCollection, id: string, uid: string, data: object): Promise<T> {
  const doc = await getOwnedSnapshot(collection, id, uid)
  await doc.ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() })
  return serializeDoc<T>(await doc.ref.get())
}

export async function deleteOwned(collection: OwnedCollection, id: string, uid: string): Promise<void> {
  const doc = await getOwnedSnapshot(collection, id, uid)
  await doc.ref.delete()
}
