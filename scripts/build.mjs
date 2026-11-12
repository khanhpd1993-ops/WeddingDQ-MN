// Tạo js/config.js từ biến môi trường (.env hoặc Vercel → Settings → Environment Variables)
// rồi copy trang thiệp vào dist/ để Vercel đưa lên mạng.
//
//   node scripts/build.mjs          → ghi js/config.js + tạo dist/
//   node scripts/build.mjs --config → chỉ ghi js/config.js (để xem thử trên máy)
//
// Thứ tự ưu tiên: biến môi trường đang có (Vercel) > file .env > giá trị mặc định.

import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = {
  APPS_SCRIPT_URL: '',
  WEDDING_TIME: '2026-11-24T17:00:00+07:00',
  MAP_QUERY: 'Trung tâm tiệc cưới CTM Palace, 131 Nguyễn Phong Sắc, Nghĩa Đô, Cầu Giấy, Hà Nội',
  MUSIC_FILE: 'assets/music.m4a',
  MUSIC_YOUTUBE_ID: 'AWKUF7xhuIw',
  MUSIC_START: '0',
};

function readDotEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = readDotEnv(join(root, '.env'));
const pick = (key) => {
  const fromProcess = process.env[key];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;
  if (fileEnv[key] !== undefined && fileEnv[key] !== '') return fileEnv[key];
  return DEFAULTS[key];
};

const config = {
  APPS_SCRIPT_URL: pick('APPS_SCRIPT_URL'),
  WEDDING_TIME: pick('WEDDING_TIME'),
  MAP_QUERY: pick('MAP_QUERY'),
  MUSIC_FILE: pick('MUSIC_FILE'),
  MUSIC_YOUTUBE_ID: pick('MUSIC_YOUTUBE_ID'),
  MUSIC_START: Number(pick('MUSIC_START')) || 0,
};

// Kiểm tra nhanh để tránh deploy cấu hình sai
if (config.APPS_SCRIPT_URL && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(config.APPS_SCRIPT_URL)) {
  console.error('✗ APPS_SCRIPT_URL không đúng dạng https://script.google.com/macros/s/…/exec');
  process.exit(1);
}
if (config.MUSIC_YOUTUBE_ID && !/^[\w-]{11}$/.test(config.MUSIC_YOUTUBE_ID)) {
  console.error('✗ MUSIC_YOUTUBE_ID phải là mã video 11 ký tự (phần sau watch?v= trong link YouTube)');
  process.exit(1);
}
if (config.MUSIC_FILE && !existsSync(join(root, config.MUSIC_FILE))) {
  console.error('✗ Không tìm thấy file nhạc ' + config.MUSIC_FILE);
  process.exit(1);
}
if (Number.isNaN(Date.parse(config.WEDDING_TIME))) {
  console.error('✗ WEDDING_TIME không phải ngày giờ hợp lệ, ví dụ 2026-11-24T17:00:00+07:00');
  process.exit(1);
}

const js = `// File này được tạo tự động bởi scripts/build.mjs từ .env — sửa .env thay vì sửa file này.
window.WEDDING = ${JSON.stringify(config, null, 2)};
`;
writeFileSync(join(root, 'js/config.js'), js);
console.log('✓ js/config.js');
console.log(config.APPS_SCRIPT_URL ? '  · Form RSVP: đã kết nối Google Sheets' : '  · Form RSVP: CHƯA có APPS_SCRIPT_URL, khách sẽ chưa gửi được');

if (process.argv.includes('--config')) process.exit(0);

// Copy những gì trang web cần vào dist/ (không đưa apps-script, scripts, .env lên mạng)
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const entry of ['index.html', 'css', 'js', 'assets', 'fonts']) {
  cpSync(join(root, entry), join(dist, entry), { recursive: true });
}
console.log('✓ dist/ sẵn sàng để deploy');
