// Shared proximity state written by OfficeCanvas, read by OfficeCall.
// Allows A/V to connect only to people who are physically nearby in the office.

type Listener = (nearbyIds: Set<number>) => void

const g = globalThis as unknown as { __officeProximity?: { nearbyIds: Set<number>; listeners: Set<Listener> } }
const store = g.__officeProximity ?? (g.__officeProximity = { nearbyIds: new Set(), listeners: new Set() })

export function updateNearby(ids: Set<number>) {
  store.nearbyIds = ids
  store.listeners.forEach(fn => fn(ids))
}

export function subscribeNearby(fn: Listener): () => void {
  store.listeners.add(fn)
  return () => store.listeners.delete(fn)
}
