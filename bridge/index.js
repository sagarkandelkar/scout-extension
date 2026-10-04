#!/usr/bin/env node
/**
 * Scout Native Messaging Bridge
 * Reads JSON messages from stdin (from browser extension)
 * Routes to Ollama for local AI inference
 * Returns JSON responses to stdout (back to extension)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'commands.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch (e) {
  console.error('Failed to load commands.json:', e.message);
}

// Native Messaging: read length-prefixed JSON from stdin
function readMessage() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => {
      chunks.push(chunk);
      // Native messaging protocol: first 4 bytes = length (uint32 LE)
      if (chunks.length === 1 && chunk.length >= 4) {
        const len = chunk.readUInt32LE(0);
        // For simplicity in development, also accept raw JSON lines
        if (len > 100000) {
          // Probably raw JSON line, not native protocol
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            const lines = raw.split('\n').filter(l => l.trim());
            resolve(JSON.parse(lines[lines.length - 1]));
          } catch { resolve(null); }
          return;
        }
      }
    });
    process.stdin.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (buf.length < 4) { resolve(null); return; }
      const len = buf.readUInt32LE(0);
      const msgBuf = buf.slice(4, 4 + len);
      try { resolve(JSON.parse(msgBuf.toString('utf8'))); }
      catch { resolve(null); }
    });
  });
}

function sendMessage(obj) {
  const json = JSON.stringify(obj);
  const buf = Buffer.from(json, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(buf.length, 0);
  process.stdout.write(lenBuf);
  process.stdout.write(buf);
}

function log(...args) {
  // Log to stderr so we don't corrupt stdout native messaging
  console.error('[scout-bridge]', ...args);
}

// Query local Ollama
function queryOllama(prompt, model = config.default_model || 'llama3.2') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ model, prompt, stream: false });
    const req = http.request(
      `${config.ollama_url || 'http://localhost:11434'}/api/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 60000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.response || '');
          } catch (e) {
            reject(new Error('Invalid Ollama response: ' + data.slice(0, 200)));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Ollama request timed out')));
    req.write(postData);
    req.end();
  });
}

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

// Extract JSON array from AI response (it sometimes adds markdown)
function extractJSON(text) {
  // Try to find JSON array
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  // Fallback: parse line by line if it looks like JSON objects
  try { return JSON.parse(text); } catch {}
  return null;
}

async function handleRequest(msg) {
  const { type, context, url, title, tabId } = msg;
  const promptConfig = config.prompts?.[type] || config.prompts?.['selection'];

  if (!promptConfig) {
    return { status: 'error', message: 'Unknown analysis type: ' + type };
  }

  const userPrompt = interpolate(promptConfig.template, {
    ...context,
    url: url || '',
    title: title || ''
  });

  log(`Analyzing ${type} for tab ${tabId}`);

  try {
    const aiResponse = await queryOllama(userPrompt);
    const insights = extractJSON(aiResponse);

    if (!insights || !Array.isArray(insights)) {
      // Fallback: wrap raw text as single insight
      return {
        status: 'ok',
        type: 'BRIDGE_RESPONSE',
        tabId,
        payload: {
          insights: [{
            type: 'info',
            severity: 'info',
            title: '🤖 AI Analysis',
            description: aiResponse.slice(0, 800),
            source: 'ai'
          }],
          siteType: type,
          url
        }
      };
    }

    // Normalize and tag AI sources
    const normalized = insights.map(i => ({
      ...i,
      type: i.type || 'info',
      severity: i.severity || 'info',
      source: 'ai'
    }));

    return {
      status: 'ok',
      type: 'BRIDGE_RESPONSE',
      tabId,
      payload: {
        insights: normalized,
        siteType: type,
        url
      }
    };
  } catch (e) {
    log('Ollama error:', e.message);
    return {
      status: 'error',
      type: 'BRIDGE_RESPONSE',
      tabId,
      payload: {
        insights: [{
          type: 'error',
          severity: 'medium',
          title: '⚠️ AI Offline',
          description: 'Could not reach Ollama. Ensure it\'s running: ollama run llama3.2',
          source: 'heuristic'
        }],
        siteType: type
      }
    };
  }
}

// Main loop
async function main() {
  log('Scout bridge started. Waiting for messages...');

  while (true) {
    try {
      const msg = await readMessage();
      if (!msg) break;
      log('Received:', msg.type || msg.action || 'unknown');

      if (msg.type === 'ping') {
        sendMessage({ status: 'ok', pong: true });
        continue;
      }

      const response = await handleRequest(msg);
      sendMessage(response);
    } catch (e) {
      log('Error handling message:', e.message);
      sendMessage({ status: 'error', message: e.message });
    }
  }

  log('Scout bridge exiting');
  process.exit(0);
}

// If run with --once, process a single message and exit (for testing)
if (process.argv.includes('--once')) {
  main();
} else {
  // In native messaging, stdin stays open
  main().catch(e => {
    log('Fatal:', e);
    process.exit(1);
  });
}
