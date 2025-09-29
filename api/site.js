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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.json(sampleSite);
    }

    if (req.method === 'POST') {
      if (!auth(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const body = JSON.parse(req.body || '{}');
      // In a real implementation, this would save to a database
      return res.json({ ok: true, site: { ...sampleSite, ...body } });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};