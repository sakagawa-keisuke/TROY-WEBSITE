const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'dev-secret-change-me';
const TOKEN_NAME = 'troy_token';

function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const cookie = cookies.split(';').find(c => c.trim().startsWith(name + '='));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
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

// Sample works data
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.json(sampleWorks);
    }

    if (req.method === 'POST') {
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

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};