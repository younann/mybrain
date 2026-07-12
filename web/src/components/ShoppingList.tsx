import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  listShopping,
  addShopping,
  toggleShopping,
  removeShopping,
  clearCheckedShopping,
  type ShoppingItem,
} from '../lib/shopping'

export function ShoppingList({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setItems(await listShopping(supabase).catch(() => []))
  }
  useEffect(() => {
    void refresh()
  }, [])

  async function add() {
    const t = text.trim()
    if (!t) return
    setText('')
    await addShopping(supabase, [t], items)
    await refresh()
  }

  async function toggle(item: ShoppingItem) {
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, checked: !x.checked } : x)))
    await toggleShopping(supabase, item.id, !item.checked)
    await refresh()
  }

  async function del(id: string) {
    setItems((xs) => xs.filter((x) => x.id !== id))
    await removeShopping(supabase, id)
  }

  async function clearDone() {
    setBusy(true)
    await clearCheckedShopping(supabase)
    await refresh()
    setBusy(false)
  }

  const doneCount = items.filter((i) => i.checked).length

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail" onClick={(e) => e.stopPropagation()}>
        <h2>🛒 Shopping list</h2>
        <div className="add-row">
          <input
            placeholder="Add an item…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button onClick={add} disabled={!text.trim()}>
            ＋
          </button>
        </div>

        {items.length === 0 ? (
          <p className="muted hint">Nothing here yet. Add items or send them from a recipe.</p>
        ) : (
          <ul className="shopping">
            {items.map((i) => (
              <li key={i.id} className={i.checked ? 'done' : ''}>
                <label>
                  <input type="checkbox" checked={i.checked} onChange={() => toggle(i)} />
                  <span>{i.text}</span>
                </label>
                <button className="link-btn" onClick={() => del(i.id)} aria-label="Remove">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="modal-actions">
          {doneCount > 0 && (
            <button className="ghost" onClick={clearDone} disabled={busy}>
              Clear {doneCount} done
            </button>
          )}
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
