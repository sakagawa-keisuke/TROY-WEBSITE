const jwt = require('jsonwebtoken');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'dev-secret-change-me';
const TOKEN_NAME = 'troy_token';

function setCookie(res, name, value, options = {}) {
  const opts = Object.assign({ httpOnly: true, sameSite: 'lax' }, options);
  let cookieStr = `${name}=${encodeURIComponent(value)}`;
  if (opts.httpOnly) cookieStr += '; HttpOnly';
  if (opts.sameSite) cookieStr += `; SameSite=${opts.sameSite}`;
  if (opts.maxAge) cookieStr += `; Max-Age=${opts.maxAge}`;
  if (opts.path) cookieStr += `; Path=${opts.path}`;
  res.setHeader('Set-Cookie', cookieStr);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(req.body || '{}');
    const { password } = body;
    
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2d' });
    setCookie(res, TOKEN_NAME, token);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};