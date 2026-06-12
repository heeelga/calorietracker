const express = require('express')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/ai/status — check if OpenAI is configured and reachable (no auth needed for admin page query)
router.get('/status', requireAuth, async (req, res) => {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return res.json({ configured: false, ok: false, error: 'OPENAI_API_KEY not set' })
  }
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      return res.json({ configured: true, ok: true })
    }
    const data = await response.json().catch(() => ({}))
    return res.json({ configured: true, ok: false, error: data?.error?.message ?? `HTTP ${response.status}` })
  } catch (err) {
    return res.json({ configured: true, ok: false, error: err.message })
  }
})

// POST /api/ai/validate-portion
// Body: { food_name, amount_grams, portion_label }
// Returns: { ok: true } | { ok: false, hint: string }
router.post('/validate-portion', requireAuth, async (req, res) => {
  const key = process.env.OPENAI_API_KEY
  if (!key) return res.json({ ok: true }) // Feature disabled — pass silently

  const { food_name, amount_grams, portion_label } = req.body
  if (!food_name || !amount_grams) return res.json({ ok: true })

  const prompt = `You are a nutrition assistant checking whether a food portion is plausible.

Food: "${food_name}"
Portion: ${portion_label} (${amount_grams}g)

Answer ONLY with a JSON object in this exact format (no other text):
{"ok": true}
or
{"ok": false, "hint": "short German-language hint explaining what seems wrong and suggesting a realistic amount"}

Rules:
- If the amount is within a realistic range for how this food is typically eaten, answer {"ok": true}
- Only answer {"ok": false} if the amount is clearly implausible (e.g. 2000g of a single egg, or 2g of a whole pizza)
- Keep the hint under 60 characters and in German
- Be lenient — only flag obvious errors`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return res.json({ ok: true }) // Fail silently

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content)
    return res.json({ ok: !!parsed.ok, hint: parsed.hint ?? null })
  } catch {
    return res.json({ ok: true }) // Always fail silently — this is optional
  }
})

module.exports = router
