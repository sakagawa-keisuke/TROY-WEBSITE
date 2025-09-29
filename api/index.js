// Vercel serverless function for TROY portfolio
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Constants
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'dev-secret-change-me';
const TOKEN_NAME = 'troy_token';

// In-memory storage for rate limiting (Vercel functions are stateless)
const loginAttempts = new Map();

// Helper functions
function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const cookie = cookies.split(';').find(c => c.trim().startsWith(name + '='));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

function setCookie(res, name, value, options = {}) {
  const opts = Object.assign({ httpOnly: true, sameSite: 'lax' }, options);
  let cookieStr = `${name}=${encodeURIComponent(value)}`;
  if (opts.httpOnly) cookieStr += '; HttpOnly';
  if (opts.sameSite) cookieStr += `; SameSite=${opts.sameSite}`;
  if (opts.maxAge) cookieStr += `; Max-Age=${opts.maxAge}`;
  if (opts.path) cookieStr += `; Path=${opts.path}`;
  res.setHeader('Set-Cookie', cookieStr);
}

function auth(req) {
  const token = getCookie(req, TOKEN_NAME) || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return false;
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (e) {
    return false;
  }
}

// Sample data for development
const sampleWorks = [
  {
    slug: 'sample-work-1',
    title: 'Sample Work 1',
    meta: 'Dir. TROY',
    cats: 'music-videos',
    kind: 'video',
    videoSrc: '/movies/sample1.mp4',
    poster: '/movies/sample1.jpg',
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    slug: 'sample-work-2', 
    title: 'Sample Work 2',
    meta: 'Dir. TROY',
    cats: 'commercials',
    kind: 'video',
    videoSrc: '/movies/sample2.mp4',
    poster: '/movies/sample2.jpg',
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

const sampleSite = {
  profile: {
    title: 'Kuroki Ryota (TROY)',
    tag: 'Film Director / 東京',
    intro: 'モード、ストリート、カルチャーを横断し、音楽とファッションの文脈でエッジのある映像表現を探求する映像監督。',
    detail: 'ミュージックビデオ、キャンペーン、ショートフィルム、インスタレーションまで幅広くディレクションを行い、愛のある圧倒的な作品を目指しています。',
    credits: [
      '領域: MV / Brand Film / Campaign / Experimental',
      '拠点: 東京（国内外出張可）',
      '別名義: TROY'
    ]
  },
  info: {
    email: 'hello@example.com',
    instagramUrl: 'https://www.instagram.com/troy_loss/#',
    instagramHandle: '@troy_loss',
    availability: [ '企画・脚本・編集まで一貫対応可', '日英コミュニケーション（要調整）', '国内外ロケーション手配（要相談）' ],
    press: [ '掲載・受賞歴はここに追記' ]
  }
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // Login endpoint
    if (pathname === '/api/login' && req.method === 'POST') {
      const body = JSON.parse(req.body || '{}');
      const { password } = body;
      
      if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2d' });
      setCookie(res, TOKEN_NAME, token);
      return res.json({ ok: true });
    }

    // Logout endpoint
    if (pathname === '/api/logout' && req.method === 'POST') {
      setCookie(res, TOKEN_NAME, '', { maxAge: 0 });
      return res.json({ ok: true });
    }

    // Me endpoint
    if (pathname === '/api/me' && req.method === 'GET') {
      if (!auth(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.json({ ok: true });
    }

    // Works endpoint
    if (pathname === '/api/works' && req.method === 'GET') {
      return res.json(sampleWorks);
    }

    // Site endpoint
    if (pathname === '/api/site' && req.method === 'GET') {
      return res.json(sampleSite);
    }

    // Works POST endpoint (create/update)
    if (pathname === '/api/works' && req.method === 'POST') {
      if (!auth(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const item = JSON.parse(req.body || '{}');
      if (!item.slug || !item.title) {
        return res.status(400).json({ error: 'slug and title are required' });
      }
      
      // In a real implementation, this would save to a database
      return res.json({ ok: true, item });
    }

    // Site POST endpoint (update site content)
    if (pathname === '/api/site' && req.method === 'POST') {
      if (!auth(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const body = JSON.parse(req.body || '{}');
      // In a real implementation, this would save to a database
      return res.json({ ok: true, site: { ...sampleSite, ...body } });
    }

    // Upload endpoint (mock for now)
    if (pathname === '/api/upload' && req.method === 'POST') {
      if (!auth(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      return res.json({ 
        ok: true, 
        path: '/movies/sample-upload.mp4',
        url: '/movies/sample-upload.mp4',
        poster: '/movies/sample-upload.jpg',
        videoUrl: '/movies/sample-upload.mp4',
        posterUrl: '/movies/sample-upload.jpg'
      });
    }

    // Default 404
    return res.status(404).json({ error: 'API endpoint not found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};