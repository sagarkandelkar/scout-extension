#!/usr/bin/env node
/**
 * Scout Local Server
 * Runs a lightweight HTTP server on localhost:8765
 * Extension connects directly — no Native Messaging needed
 * Supports Ollama native API and OpenAI-compatible endpoints
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

// Optional auth token (for Anthropic-style proxies)
const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || process.env.OLLAMA_AUTH_TOKEN || '';

function log(...args) {
  console.log('[scout-server]', ...args);
}

// Detect API format
const API_FORMAT = config.api_format || 'ollama';
const BASE_URL = config.ollama_url || 'http://localhost:11434';

// Query AI backend — supports Ollama native and OpenAI-compatible formats
function queryAI(prompt, systemPrompt, model = config.default_model || 'mistral:7b') {
  return new Promise((resolve, reject) => {
    let endpoint, postData, headers;

    if (API_FORMAT === 'openai') {
      // OpenAI-compatible / Anthropic-style endpoint
      endpoint = `${BASE_URL}/v1/chat/completions`;
      postData = JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        stream: false,
        temperature: 0.7
      });
      headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
      if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
        headers['x-api-key'] = AUTH_TOKEN;
      }
    } else {
      // Ollama native format
      endpoint = `${BASE_URL}/api/generate`;
      postData = JSON.stringify({
        model: model,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false
      });
      headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
      if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      }
    }

    const url = new URL(endpoint);
    const client = url.protocol === 'https:' ? require('https') : http;

    const req = client.request(
      endpoint,
      { method: 'POST', headers, timeout: 120000 },
      (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (API_FORMAT === 'openai') {
              resolve(parsed.choices?.[0]?.message?.content || parsed.content?.[0]?.text || '');
            } else {
              resolve(parsed.response || '');
            }
          } catch (e) {
            reject(new Error('Invalid response: ' + data.slice(0, 200)));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('AI request timed out')));
    req.write(postData);
    req.end();
  });
}

// Query AI with full conversation history (for chat endpoint)
function queryChatAI(messages, model = config.default_model || 'mistral:7b') {
  return new Promise((resolve, reject) => {
    let endpoint, postData, headers;

    if (API_FORMAT === 'openai') {
      endpoint = `${BASE_URL}/v1/chat/completions`;
      postData = JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        temperature: 0.7
      });
      headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
      if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
        headers['x-api-key'] = AUTH_TOKEN;
      }
    } else {
      // Ollama native: convert messages to single prompt
      const systemMsg = messages.find(m => m.role === 'system');
      const chatMsgs = messages.filter(m => m.role !== 'system');
      const prompt = chatMsgs.map(m => `${m.role}: ${m.content}`).join('\n\n');

      endpoint = `${BASE_URL}/api/generate`;
      postData = JSON.stringify({
        model: model,
        prompt: systemMsg ? `${systemMsg.content}\n\n${prompt}` : prompt,
        stream: false
      });
      headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
      if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      }
    }

    const url = new URL(endpoint);
    const client = url.protocol === 'https:' ? require('https') : http;

    const req = client.request(
      endpoint,
      { method: 'POST', headers, timeout: 120000 },
      (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (API_FORMAT === 'openai') {
              resolve(parsed.choices?.[0]?.message?.content || parsed.content?.[0]?.text || '');
            } else {
              resolve(parsed.response || '');
            }
          } catch (e) {
            reject(new Error('Invalid response: ' + data.slice(0, 200)));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('AI request timed out')));
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

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      format: API_FORMAT,
      model: config.default_model || 'unknown',
      backend: BASE_URL,
      version: '1.0.0'
    }));
    return;
  }

  // Route handlers
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', async () => {
      try {
        const msg = JSON.parse(body);
        const { messages, model } = msg;

        log(`Chat | Model: ${model || config.default_model} | Messages: ${messages?.length || 0}`);

        const response = await queryChatAI(messages, model || config.default_model);
        res.writeHead(200);
        res.end(JSON.stringify({ response }));
      } catch (e) {
        log('Chat error:', e.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/analyze') {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found. Use GET /health, POST /analyze, or POST /chat' }));
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

      log(`Analyzing ${type} | Model: ${config.default_model} | URL: ${url?.slice(0, 60)}...`);

      const aiResponse = await queryAI(userPrompt, promptConfig.system, config.default_model);
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
            ? `Cannot connect to AI backend at ${BASE_URL}. Ensure Ollama or your proxy is running.`
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
  log(`   API format: ${API_FORMAT}`);
  log(`   Backend: ${BASE_URL}`);
  log(`   Model: ${config.default_model || 'mistral:7b'}`);
  if (AUTH_TOKEN) log(`   Auth: configured`);
  log('');
  log('Endpoints:');
  log('  GET  /health     — Server status');
  log('  POST /analyze    — Site analysis (Scout overlay)');
  log('  POST /chat       — Conversation chat (Scout Chat panel)');
  log('');
  log('Make sure your AI backend is running:');
  if (API_FORMAT === 'openai') {
    log('  ANTHROPIC_BASE_URL=http://localhost:11434 ollama serve');
  } else {
    log('  ollama serve');
  }
  log('');
  log('Then load the extension in your browser and start surfing.');
  log('Press Ctrl+C to stop.');
});

process.on('SIGINT', () => {
  log('\n👋 Shutting down...');
  server.close(() => process.exit(0));
});
