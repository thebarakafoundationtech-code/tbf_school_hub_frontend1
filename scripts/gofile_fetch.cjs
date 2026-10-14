const https = require('https');
const vm = require('vm');
const fs = require('fs');
const crypto = require('crypto');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          text: () => Promise.resolve(buffer.toString('utf8')),
          json: () => Promise.resolve(JSON.parse(buffer.toString('utf8'))),
          buffer: () => Promise.resolve(buffer)
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getGoFileFolder(contentId) {
  console.log(`[GoFile] Fetching info for folder: ${contentId}`);
  
  // 1. Get wt.obf.js
  const wtRes = await fetch('https://gofile.io/js/wt.obf.js', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const wtCode = await wtRes.text();

  // 2. Get guest token
  const accRes = await fetch('https://api.gofile.io/accounts', {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const accData = await accRes.json();
  const token = accData?.data?.token;
  console.log(`[GoFile] Obtained guest token: ${token}`);

  // 3. Run WT generator in sandbox
  const context = {
    console,
    Math,
    Date,
    String,
    Array,
    Object,
    parseInt,
    crypto: crypto.webcrypto,
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      language: 'en-US',
      languages: ['en-US', 'en'],
      platform: 'Linux x86_64'
    },
    document: {
      querySelector: () => null,
      createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
      documentElement: {}
    },
    location: {
      href: `https://gofile.io/d/${contentId}`,
      hostname: 'gofile.io',
      pathname: `/d/${contentId}`
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(wtCode, context);

  const wt = await context.generateWT(token);
  console.log(`[GoFile] Generated website token (WT) successfully.`);

  // 4. Fetch content details
  const contentsUrl = `https://api.gofile.io/contents/${contentId}?page=1&pageSize=500&sortField=name&sortDirection=1`;
  const contRes = await fetch(contentsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Authorization': `Bearer ${token}`,
      'X-Website-Token': wt
    }
  });

  const contData = await contRes.json();
  console.log(`[GoFile] Folder response status: ${contData.status}`);
  return { data: contData.data, token, wt };
}

async function main() {
  const contentId = process.argv[2] || 'vBgI7y8I';
  const result = await getGoFileFolder(contentId);
  console.log('Result data:', JSON.stringify(result.data, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error('[GoFile] Error:', err);
    process.exit(1);
  });
}

module.exports = { getGoFileFolder, fetch };
