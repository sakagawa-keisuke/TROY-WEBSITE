/* Minimal admin backend for TROY portfolio
   - Static hosting + JSON API
   - Password login via ADMIN_PASSWORD env (JWT cookie)
   - File uploads to assets/works/
   - Works manifest persisted in data/works.json
*/

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = ROOT; // serve the site root
// Save uploaded media under /movies
const WORKS_DIR = path.join(ROOT, 'movies');
const MANIFEST = path.join(DATA_DIR, 'works.json');
const SITE_JSON = path.join(DATA_DIR, 'site.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(WORKS_DIR, { recursive: true });
if (!fs.existsSync(MANIFEST)) fs.writeFileSync(MANIFEST, '[]');
if (!fs.existsSync(SITE_JSON)) {
  const defaults = {
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
  fs.writeFileSync(SITE_JSON, JSON.stringify(defaults, null, 2));
}

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'dev-secret-change-me';
const TOKEN_NAME = 'troy_token';

// Rate limiting for login attempts
const loginAttempts = new Map(); // IP -> { count, lastAttempt, blockedUntil }
const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_TIME = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes window

function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0, blockedUntil: 0 };

  // Check if IP is currently blocked
  if (attempts.blockedUntil > now) {
    const remainingTime = Math.ceil((attempts.blockedUntil - now) / 1000 / 60);
    return res.status(429).json({ error: `Too many login attempts. Try again in ${remainingTime} minutes.` });
  }

  // Reset counter if attempt window has passed
  if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
    attempts.count = 0;
  }

  // Check attempt limit
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.blockedUntil = now + BLOCK_TIME;
    loginAttempts.set(ip, attempts);
    const remainingTime = Math.ceil(BLOCK_TIME / 1000 / 60);
    return res.status(429).json({ error: `Too many login attempts. Try again in ${remainingTime} minutes.` });
  }

  // Store attempt info for potential failure
  req.loginAttempt = { ip, attempts };
  next();
}

function auth(req, res, next) {
  const token = req.cookies[TOKEN_NAME] || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Login with rate limiting
app.post('/api/login', rateLimitLogin, (req, res) => {
  const { password } = req.body || {};
  const { ip, attempts } = req.loginAttempt;
  
  if (!password || password !== ADMIN_PASSWORD) {
    // Increment failed attempts
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(ip, attempts);
    
    // Add delay for failed attempts to slow down brute force
    const delay = Math.min(attempts.count * 1000, 5000); // Max 5 second delay
    setTimeout(() => {
      res.status(401).json({ error: 'Invalid credentials' });
    }, delay);
    return;
  }
  
  // Successful login - clear attempts
  loginAttempts.delete(ip);
  
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2d' });
  res.cookie(TOKEN_NAME, token, { httpOnly: true, sameSite: 'lax' });
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => { res.clearCookie(TOKEN_NAME); res.json({ ok: true }); });
app.get('/api/me', auth, (req, res) => res.json({ ok: true }));

// Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, WORKS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ts = Date.now();
    cb(null, `upload-${ts}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 1024 } }); // up to 1GB

app.post('/api/upload', auth, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) return next(err);
      if (!req.file) return next(new Error('ファイルが見つかりません'));
      const origAbs = req.file.path;
      const ext = path.extname(origAbs).toLowerCase();
      const ts = Date.now();
      const finalBase = `work-${ts}`;
      const finalRel = path.join('movies', `${finalBase}.mp4`);
      const finalAbs = path.join(PUBLIC_DIR, finalRel);
      const posterRel = path.join('movies', `${finalBase}.jpg`);
      const posterAbs = path.join(PUBLIC_DIR, posterRel);
      // Poster time (seconds). default 0
      const rawPosterSec = (req.body?.posterSec ?? req.query?.posterSec ?? '0').toString();
      let posterSec = parseFloat(rawPosterSec);
      if (!Number.isFinite(posterSec) || posterSec < 0) posterSec = 0;
      const posterTimemark = posterSec.toFixed(2).replace(/\.00$/, '.0');

      const isVideo = ['.mp4','.mov','.m4v','.webm'].includes(ext);
      if (isVideo && ffmpegPath) {
        await new Promise((resolve, reject) => {
          ffmpeg(origAbs)
            .outputOptions([
              '-c:v libx264',
              '-pix_fmt yuv420p',
              '-profile:v high',
              '-level 4.1',
              '-movflags +faststart',
              '-c:a aac',
              '-b:a 192k'
            ])
            .save(finalAbs)
            .on('end', resolve)
            .on('error', reject);
        });
        // Try requested poster time, fallback to 0s if it fails
        try {
          await new Promise((resolve, reject) => {
            ffmpeg(finalAbs)
              .screenshots({ count:1, timemarks:[posterTimemark], filename: path.basename(posterAbs), folder: path.dirname(posterAbs), size: '1280x?' })
              .on('end', resolve)
              .on('error', reject);
          });
        } catch (e) {
          await new Promise((resolve, reject) => {
            ffmpeg(finalAbs)
              .screenshots({ count:1, timemarks:['0'], filename: path.basename(posterAbs), folder: path.dirname(posterAbs), size: '1280x?' })
              .on('end', resolve)
              .on('error', reject);
          });
        }
        try { fs.unlinkSync(origAbs); } catch {}
        return res.json({ ok: true, path: finalRel, url: '/' + finalRel, poster: '/' + posterRel, videoUrl: '/' + finalRel, posterUrl: '/' + posterRel });
      } else {
        const rel = path.relative(PUBLIC_DIR, origAbs).split(path.sep).join('/');
        // Even without ffmpeg, return kind and videoUrl if it looks like a video
        const looksVideo = ['.mp4','.mov','.m4v','.webm'].includes(ext);
        const payload = { ok: true, path: rel, url: '/' + rel };
        if (looksVideo) {
          payload.kind = 'video';
          payload.videoUrl = '/' + rel;
        } else {
          payload.kind = 'image';
        }
        return res.json(payload);
      }
    } catch (e) { return next(e); }
  });
});

// Generate poster for an existing video at specified seconds
app.post('/api/poster', auth, async (req, res, next) => {
  try {
    if (!ffmpegPath) return res.status(500).json({ error: 'FFmpeg not available' });
    const { videoSrc, posterSec } = req.body || {};
    if (!videoSrc) return res.status(400).json({ error: 'videoSrc required' });
    const abs = path.join(PUBLIC_DIR, String(videoSrc).replace(/^\//, ''));
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'video not found' });
    let sec = parseFloat(posterSec); if (!Number.isFinite(sec) || sec < 0) sec = 0;
    const ts = Date.now();
    const posterRel = path.join('movies', `poster-${ts}.jpg`);
    const posterAbs = path.join(PUBLIC_DIR, posterRel);
    await new Promise((resolve, reject) => {
      ffmpeg(abs).screenshots({ count:1, timemarks:[sec.toFixed(2).replace(/\.00$/, '.0')], filename: path.basename(posterAbs), folder: path.dirname(posterAbs), size: '1280x?' }).on('end', resolve).on('error', reject);
    });
    res.json({ ok: true, poster: '/' + posterRel, posterUrl: '/' + posterRel });
  } catch (e) { next(e); }
});

// Works manifest helpers
function readManifest() { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); }
function writeManifest(items) { fs.writeFileSync(MANIFEST, JSON.stringify(items, null, 2)); }

function normalizeTime(val) {
  if (!val && val !== 0) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const t = Date.parse(val);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function applySchedules(items) {
  let changed = false;
  const now = Date.now();
  for (const w of items) {
    if (!w) continue;
    const ts = normalizeTime(w.scheduledAt);
    if (ts != null && ts <= now && w.published !== true) {
      w.published = true;
      delete w.scheduledAt;
      w.updatedAt = now;
      changed = true;
    }
  }
  return changed;
}

function isAuthed(req) {
  try {
    const token = req.cookies[TOKEN_NAME] || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return false;
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch { return false; }
}
function readSite() { return JSON.parse(fs.readFileSync(SITE_JSON, 'utf8')); }
function writeSite(data) { fs.writeFileSync(SITE_JSON, JSON.stringify(data, null, 2)); }

// Utility: list movies directory and build sample items
function listMoviesAsItems() {
  const items = [];
  if (!fs.existsSync(WORKS_DIR)) return items;
  const catsPool = ['commercials','music-videos','short-films','feature-films'];
  const typePool = ['Brand Campaign','Music Video','Short Film','Documentary'];
  const clientPool = ['Client A','Client B','Client C','Client D'];
  let i = 0;
  for (const name of fs.readdirSync(WORKS_DIR)) {
    const ext = path.extname(name).toLowerCase();
    if (!['.mp4','.mov','.m4v','.webm'].includes(ext)) continue;
    const base = path.basename(name, ext);
    const slug = base.toLowerCase().replace(/[^a-z0-9\-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || `work-${i}`;
    const stat = fs.statSync(path.join(WORKS_DIR, name));
    const year = new Date(stat.mtimeMs || Date.now()).getFullYear();
    const cats = catsPool[i % catsPool.length];
    const projectType = typePool[i % typePool.length];
    const clientName = clientPool[i % clientPool.length];
    const posterCandidate = path.join(WORKS_DIR, base + '.jpg');
    const poster = fs.existsSync(posterCandidate) ? ('/movies/' + base + '.jpg') : '';
    items.push({
      slug,
      title: base,
      meta: 'Dir. TROY',
      cats,
      kind: 'video',
      videoSrc: '/movies/' + name,
      poster,
      projectType,
      date: String(year),
      role: 'Director',
      clientName,
      published: true
    });
    i++;
  }
  return items;
}

// List works: public -> only published; admin (authed) -> all
app.get('/api/works', (req, res) => {
  const items = readManifest();
  if (applySchedules(items)) writeManifest(items);
  if (isAuthed(req)) return res.json(items);
  // include if published !== false (missing means published)
  const pub = items.filter(w => w && w.published !== false);
  if (pub.length > 0) return res.json(pub);
  // Fallback: list movies as sample when no published works available
  return res.json(listMoviesAsItems());
});

// Site content (profile/info)
app.get('/api/site', (req, res) => {
  try { res.json(readSite()); } catch (e) { res.json({}); }
});
app.post('/api/site', auth, (req, res) => {
  const body = req.body || {};
  const current = readSite();
  const next = { ...current, ...body };
  writeSite(next);
  res.json({ ok: true, site: next });
});

// Add/update work
app.post('/api/works', auth, (req, res) => {
  const item = req.body || {};
  if (!item.slug || !item.title) return res.status(400).json({ error: 'slug and title are required' });
  const items = readManifest();
  const i = items.findIndex((w) => w.slug === item.slug);
  if (i >= 0) {
    const prev = items[i] || {};
    const published = (typeof item.published === 'boolean') ? item.published : (typeof prev.published === 'boolean' ? prev.published : false);
    items[i] = { ...prev, ...item, published, updatedAt: Date.now() };
  } else {
    const published = (typeof item.published === 'boolean') ? item.published : false; // default private
    items.unshift({ ...item, published, createdAt: Date.now(), updatedAt: Date.now() });
  }
  writeManifest(items);
  res.json({ ok: true, item });
});

// Bulk update publish / schedule
app.post('/api/works/bulk', auth, (req, res) => {
  const body = req.body || {};
  const slugs = Array.isArray(body.slugs) ? body.slugs : [];
  if (slugs.length === 0) return res.status(400).json({ error: 'slugs required' });
  const items = readManifest();
  const now = Date.now();
  let count = 0;
  for (const w of items) {
    if (!w || !slugs.includes(w.slug)) continue;
    if (typeof body.published === 'boolean') w.published = body.published;
    if (body.scheduledAt != null && body.scheduledAt !== '') {
      const ts = normalizeTime(body.scheduledAt);
      if (ts != null) { w.scheduledAt = ts; w.published = false; }
    }
    w.updatedAt = now; count++;
  }
  writeManifest(items);
  res.json({ ok: true, count });
});

// Import all videos from movies/ into manifest
app.post('/api/import-movies', auth, (req, res) => {
  const { mode = 'replace', defaultPublished = true } = req.body || {};
  const current = readManifest();
  const fromMovies = listMoviesAsItems().map(it => ({ ...it, published: !!defaultPublished }));
  let next = [];
  if (mode === 'merge') {
    const map = new Map(current.map(w => [w.slug, w]));
    for (const it of fromMovies) map.set(it.slug, { ...(map.get(it.slug) || {}), ...it, updatedAt: Date.now(), createdAt: map.get(it.slug)?.createdAt || Date.now() });
    next = Array.from(map.values());
  } else { // replace
    const now = Date.now();
    next = fromMovies.map(it => ({ ...it, createdAt: now, updatedAt: now }));
  }
  writeManifest(next);
  res.json({ ok: true, count: next.length });
});

// Schedule watchdog
setInterval(() => {
  try {
    const items = readManifest();
    if (applySchedules(items)) writeManifest(items);
  } catch {}
}, 60 * 1000);

// Delete work
app.delete('/api/works/:slug', auth, (req, res) => {
  const slug = req.params.slug;
  const items = readManifest();
  const next = items.filter((w) => w.slug !== slug);
  writeManifest(next);
  res.json({ ok: true });
});

// Normalize existing works: transcode to H.264 MP4 with simple names and posters
app.post('/api/normalize', auth, async (req, res, next) => {
  try {
    if (!ffmpegPath) return res.status(500).json({ error: 'FFmpeg not available' });
    const rawPosterSec = (req.body?.posterSec ?? req.query?.posterSec ?? '0').toString();
    let posterSec = parseFloat(rawPosterSec);
    if (!Number.isFinite(posterSec) || posterSec < 0) posterSec = 0;
    const posterTimemark = posterSec.toFixed(2).replace(/\.00$/, '.0');
    const items = readManifest();
    for (const w of items) {
      if (!w.videoSrc) continue;
      const curRel = w.videoSrc.replace(/^\//, '');
      const curAbs = path.join(PUBLIC_DIR, curRel);
      if (!fs.existsSync(curAbs)) continue;
      const ts = Date.now();
      const base = (w.slug || 'work').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'work';
      const finalRel = path.join('movies', `${base}-${ts}.mp4`);
      const finalAbs = path.join(PUBLIC_DIR, finalRel);
      const posterRel = path.join('movies', `${base}-${ts}.jpg`);
      const posterAbs = path.join(PUBLIC_DIR, posterRel);
      await new Promise((resolve, reject) => {
        ffmpeg(curAbs)
          .outputOptions(['-c:v libx264','-pix_fmt yuv420p','-profile:v high','-level 4.1','-movflags +faststart','-c:a aac','-b:a 192k'])
          .save(finalAbs).on('end', resolve).on('error', reject);
      });
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(finalAbs).screenshots({ count:1, timemarks:[posterTimemark], filename: path.basename(posterAbs), folder: path.dirname(posterAbs), size: '1280x?' }).on('end', resolve).on('error', reject);
        });
      } catch (e) {
        await new Promise((resolve, reject) => {
          ffmpeg(finalAbs).screenshots({ count:1, timemarks:['0'], filename: path.basename(posterAbs), folder: path.dirname(posterAbs), size: '1280x?' }).on('end', resolve).on('error', reject);
        });
      }
      w.videoSrc = '/' + finalRel;
      w.poster = '/' + posterRel;
    }
    writeManifest(items);
    res.json({ ok: true, count: items.length });
  } catch (e) { next(e); }
});

// Static
app.get(['/admin','/admin.html'], (req,res) => {
  try { res.sendFile(path.join(PUBLIC_DIR, 'admin.html')); }
  catch { res.status(404).send('Not found'); }
});
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// robots.txt
app.get('/robots.txt', (req,res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\n');
});

// sitemap.xml (published works + pages)
app.get('/sitemap.xml', (req,res) => {
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const items = readManifest().filter(w=> w && w.published !== false);
    const urls = [
      `${origin}/`,
      `${origin}/profile.html`,
      `${origin}/info.html`,
      ...items.map(w => `${origin}/#project/${encodeURIComponent(w.slug)}`)
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) { res.status(500).send(''); }
});

// Error handler (JSON)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 400;
  res.status(status).json({ error: err.message || 'Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TROY site + admin running at http://localhost:${PORT}`);
});
