const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')

const router = express.Router()

function makeToken(profile) {
  return jwt.sign(
    { id: profile.id, email: profile.email, is_admin: profile.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )
}

function stripPassword(profile) {
  const { password_hash, ...rest } = profile
  return rest
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    if (process.env.REGISTRATION_ENABLED === 'false') {
      return res.status(403).json({ error: 'Registrierung ist deaktiviert. Bitte einen Administrator kontaktieren.' })
    }
    const { name, email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' })

    const [existing] = await pool.query('SELECT id FROM profiles WHERE email = ?', [email])
    if (existing.length > 0) return res.status(409).json({ error: 'E-Mail bereits registriert' })

    const [countRows] = await pool.query('SELECT COUNT(*) as cnt FROM profiles')
    const isAdmin = countRows[0].cnt === 0

    const password_hash = await bcrypt.hash(password, 10)
    const id = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      `INSERT INTO profiles (id, name, email, password_hash, xp, level, streak_days, onboarding_done, is_admin, is_banned, created_at)
       VALUES (?, ?, ?, ?, 0, 1, 0, FALSE, ?, FALSE, ?)`,
      [id, name || null, email, password_hash, isAdmin, now]
    )

    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [id])
    const profile = rows[0]
    const token = makeToken(profile)

    res.json({ token, profile: stripPassword(profile) })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' })

    const [rows] = await pool.query('SELECT * FROM profiles WHERE email = ?', [email])
    if (rows.length === 0) return res.status(401).json({ error: 'Ungültige Anmeldedaten' })

    const profile = rows[0]

    if (profile.is_banned) return res.status(403).json({ error: 'Konto gesperrt. Bitte kontaktiere den Administrator.' })

    const valid = await bcrypt.compare(password, profile.password_hash || '')
    if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten' })

    const token = makeToken(profile)
    res.json({ token, profile: stripPassword(profile) })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// GET /api/auth/mtls — auto-login via Traefik X-Forwarded-Tls-Client-Cert-Info header
router.get('/mtls', async (req, res) => {
  if (process.env.MTLS_ENABLED !== 'true') {
    return res.status(404).json({ error: 'mTLS-Login nicht aktiviert' })
  }
  try {
    const certInfo = req.headers['x-forwarded-tls-client-cert-info']
    if (!certInfo) return res.status(401).json({ error: 'Kein Zertifikat' })

    const decoded = decodeURIComponent(certInfo)
    const cnMatch = decoded.match(/CN=([^,"/]+)/)
    if (!cnMatch) return res.status(401).json({ error: 'CN nicht gefunden' })

    const cn = cnMatch[1].trim()
    // CN format is often "device-username" (e.g. "zeus-markus"), extract part after last hyphen
    const namePart = cn.includes('-') ? cn.substring(cn.lastIndexOf('-') + 1) : cn

    const [rows] = await pool.query(
      'SELECT * FROM profiles WHERE LOWER(name) = LOWER(?) OR LOWER(name) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [cn, namePart, cn]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' })

    const profile = rows[0]
    if (profile.is_banned) return res.status(403).json({ error: 'Konto gesperrt' })

    const token = makeToken(profile)
    res.json({ token, profile: stripPassword(profile) })
  } catch (err) {
    console.error('mTLS error:', err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

module.exports = router
