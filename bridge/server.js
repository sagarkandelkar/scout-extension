#!/usr/bin/env node
/**
 * Scout Local Server
 * Runs a lightweight HTTP server on localhost:8765
 * Extension connects directly — no Native Messaging needed
 * Forwards requests to local Ollama
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const HOST = '127.0.0.1';
const CONFIG_PATH = path.join(__dirname, 'commands.json');

let config = {};
try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch (e) {
  console.error('[scout-server] Could not load commands.json:', e.message);
}

function log(...args) {
  console.log('[scout-server]', ...args);
}

// Query Ollama
function queryOllama(prompt, model = config.default_model || 'llama3.2') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ model, prompt, stream: false });
    const req = require('http').request(
      `${config.ollama_url || 'http://localhost:11434'}/api/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 120000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.response || '');
          } catch (e) {
            reject(new Error('Invalid Ollama response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Ollama timeout')));
    req.write(postData);
    req.end();
  });
}

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

function extractJSON(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  try { return JSON.parse(text); } catch {}
  return null;
}

const server = http.createServer(async (req, res) => {
  // CORS headers so browser extension can talk to localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/analyze') {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found. POST /analyze' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => body += chunk);
  req.on('end', async () => {
    try {
      const msg = JSON.parse(body);
      const { type, context, url, title } = msg;
      const promptConfig = config.prompts?.[type] || config.prompts?.['selection'];

      if (!promptConfig) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Unknown type: ' + type }));
        return;
      }

      const userPrompt = interpolate(promptConfig.template, {
        ...context,
        url: url || '',
        title: title || ''
      });

      log(`Analyzing ${type} | URL: ${url?.slice(0, 60)}...`);

      const aiResponse = await queryOllama(userPrompt);
      const insights = extractJSON(aiResponse);

      if (!insights || !Array.isArray(insights)) {
        // Wrap raw response
        res.writeHead(200);
        res.end(JSON.stringify({
          insights: [{
            type: 'info',
            severity: 'info',
            title: '🤖 AI Analysis',
            description: aiResponse.slice(0, 1200),
            source: 'ai'
          }],
          siteType: type
        }));
        return;
      }

      const normalized = insights.map(i => ({
        ...i,
        type: i.type || 'info',
        severity: i.severity || 'info',
        source: 'ai'
      }));

      res.writeHead(200);
      res.end(JSON.stringify({
        insights: normalized,
        siteType: type
      }));

    } catch (e) {
      log('Error:', e.message);
      res.writeHead(500);
      res.end(JSON.stringify({
        error: e.message,
        insights: [{
          type: 'error',
          severity: 'medium',
          title: '⚠️ AI Error',
          description: e.message.includes('ECONNREFUSED')
            ? 'Cannot connect to Ollama. Run: ollama serve'
            : e.message,
          source: 'heuristic'
        }],
        siteType: msg?.type || 'unknown'
      }));
    }
  });
});

server.listen(PORT, HOST, () => {
  log(`✅ Scout server running at http://${HOST}:${PORT}`);
  log('');
  log('Make sure Ollama is running:');
  log('  ollama serve');
  log('');
  log('Then load the extension in your browser and start surfing.');
  log('Press Ctrl+C to stop.');
});

process.on('SIGINT', () => {
  log('\n👋 Shutting down...');
  server.close(() => process.exit(0));
});
