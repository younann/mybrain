import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { addShopping, listShopping } from '../lib/shopping'
import type { ParsedRecipe } from '../lib/recipe'

export function CookMode({ recipe, onClose }: { recipe: ParsedRecipe; onClose: () => void }) {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [step, setStep] = useState(0)
  const [added, setAdded] = useState(false)

  function toggle(i: number) {
    setChecked((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function toShoppingList() {
    const existing = await listShopping(supabase).catch(() => [])
    await addShopping(supabase, recipe.ingredients, existing)
    setAdded(true)
  }

  const steps = recipe.steps
  const hasSteps = steps.length > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail cook" onClick={(e) => e.stopPropagation()}>
        <h2>👨‍🍳 {recipe.title || 'Recipe'}</h2>

        {recipe.ingredients.length > 0 && (
          <>
            <div className="detail-label">Ingredients</div>
            <ul className="shopping">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className={checked.has(i) ? 'done' : ''}>
                  <label>
                    <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
                    <span>{ing}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button className="ghost" onClick={toShoppingList} disabled={added}>
              {added ? '✅ Added to shopping list' : '🛒 Add ingredients to shopping list'}
            </button>
          </>
        )}

        {hasSteps && (
          <div className="cook-step">
            <div className="detail-label">
              Step {step + 1} of {steps.length}
            </div>
            <p className="cook-step-text">{steps[step]}</p>
            <div className="cook-nav">
              <button className="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                ← Back
              </button>
              <button
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                disabled={step === steps.length - 1}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
