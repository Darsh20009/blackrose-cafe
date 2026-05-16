#!/usr/bin/env node
/**
 * QIROX Print Relay Agent - v1.2.0
 * =================================
 * وكيل الطباعة المحلي - يعمل على أي جهاز في الشبكة (ويندوز / ماك / لينكس / Raspberry Pi)
 * يستقبل أوامر الطباعة من المتصفح ويرسلها مباشرة للطابعة عبر TCP
 *
 * تثبيت Node.js: https://nodejs.org
 * التشغيل: node print-relay.js
 *
 * المنفذ الافتراضي: 8089
 * يمكن تغييره: PORT=8090 node print-relay.js
 */

const http = require('http');
const net  = require('net');
const os   = require('os');

const PORT    = Number(process.env.PORT)    || 8089;
const TIMEOUT = Number(process.env.TIMEOUT) || 6000;

// ── مساعد: الحصول على IPs المحلية ───────────────────────────────────────────
function getLocalIPs() {
  const ips = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

// ── إرسال بيانات ESC/POS مباشرة للطابعة عبر TCP ────────────────────────────
function sendToThermalPrinter(ip, port, buffer) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let done        = false;
    let writeStarted = false;

    // مهلة ديناميكية: الحد الأدنى 10 ثوانٍ + ثانية لكل 10KB من البيانات
    // هذا يعالج الفواتير الكبيرة (صور رسترية كثيرة المنتجات) التي تحتاج وقتاً أطول
    const dynamicTimeout = Math.max(10000, Math.ceil(buffer.length / 10000) * 1000);

    const onError = (err) => {
      if (done) return;
      done = true;
      client.destroy();
      reject(err);
    };

    const onDone = () => {
      if (done) return;
      done = true;
      resolve();
    };

    client.setTimeout(dynamicTimeout);
    client.connect(port, ip, () => {
      writeStarted = true;
      client.write(buffer, (err) => {
        if (err) return onError(err);
        // إغلاق أنيق: يرسل FIN بعد تفريغ جميع البيانات المؤقتة
        // على عكس destroy()، لا يرسل RST ولا يقطع البيانات في منتصف الطريق
        client.end();
      });
    });

    // الاتصال أُغلق بالكامل من الطرفين = جميع البيانات وصلت للطابعة
    client.on('close', onDone);

    client.on('error', onError);

    client.on('timeout', () => {
      if (!writeStarted) {
        // انتهت المهلة قبل بدء الكتابة = مشكلة اتصال
        onError(new Error(`انتهت مهلة الاتصال بـ ${ip}:${port}`));
      } else {
        // انتهت المهلة بعد بدء الكتابة = البيانات في الطريق، نغلق بأمان
        client.destroy();
        onDone();
      }
    });
  });
}

// ── إضافة CORS headers ───────────────────────────────────────────────────────
function addCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  res.setHeader('Access-Control-Max-Age',       '86400');
}

// ── قراءة body الطلب ─────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data',  c  => { body += c; if (body.length > 2_000_000) reject(new Error('Request too large')); });
    req.on('end',   ()  => resolve(body));
    req.on('error', err => reject(err));
  });
}

// ── الخادم ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  addCORSHeaders(res);

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── GET /status  ─ للفحص والـ ping ──────────────────────────────────────
  if (req.method === 'GET' && (req.url === '/' || req.url === '/status')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status:  'ok',
      name:    'QIROX Print Relay Agent',
      version: '1.1.0',
      port:    PORT,
      localIPs: getLocalIPs(),
    }));
    return;
  }

  // ── POST /print  ─ إرسال ESC/POS للطابعة ────────────────────────────────
  if (req.method === 'POST' && req.url === '/print') {
    try {
      const raw   = await readBody(req);
      const body  = JSON.parse(raw);
      const { ip, port, data } = body;

      if (!ip || !data) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'ip و data مطلوبان' }));
        return;
      }

      const buffer = Buffer.from(data, 'base64');
      const printerPort = Number(port) || 9100;

      console.log(`[${new Date().toLocaleTimeString('ar-SA')}] 🖨️  طباعة → ${ip}:${printerPort}  (${buffer.length} bytes)`);

      await sendToThermalPrinter(ip, printerPort, buffer);

      console.log(`[${new Date().toLocaleTimeString('ar-SA')}] ✅ نجح الإرسال إلى ${ip}:${printerPort}`);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));

    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString('ar-SA')}] ❌ فشل:`, err.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // ── POST /test  ─ اختبار الاتصال فقط (بدون طباعة) ──────────────────────
  if (req.method === 'POST' && req.url === '/test') {
    try {
      const raw  = await readBody(req);
      const body = JSON.parse(raw);
      const { ip, port } = body;

      if (!ip) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'ip مطلوب' }));
        return;
      }

      const printerPort = Number(port) || 9100;
      // ESC @ (تهيئة الطابعة) — لا يطبع شيئاً، فقط يتحقق من الاتصال
      const initCmd = Buffer.from([0x1B, 0x40]);
      await sendToThermalPrinter(ip, printerPort, initCmd);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, message: `✅ الطابعة ${ip}:${printerPort} تستجيب` }));

    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        QIROX Print Relay Agent - وكيل الطباعة           ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  المنفذ : ${PORT}                                           ║`);
  console.log('║  الحالة : يعمل ✅                                         ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  عناوين الجهاز (ادخل أي منها في إعدادات النظام):        ║');
  ips.forEach(ip => {
    const line = `║    http://${ip}:${PORT}`;
    console.log(line.padEnd(62) + '║');
  });
  if (ips.length === 0) {
    console.log(`║    http://localhost:${PORT}`.padEnd(62) + '║');
  }
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('في انتظار طلبات الطباعة... اضغط Ctrl+C للإيقاف');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ المنفذ ${PORT} مستخدم. شغّل: PORT=8090 node print-relay.js`);
  } else {
    console.error('❌ خطأ في الخادم:', err.message);
  }
  process.exit(1);
});

process.on('SIGINT',  () => { console.log('\n👋 تم إيقاف وكيل الطباعة.'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n👋 تم إيقاف وكيل الطباعة.'); process.exit(0); });
