#!/usr/bin/env node
/**
 * Scout Native Host Installer
 * Registers the native messaging manifest for Chrome/Edge
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const EXTENSION_ID = 'YOUR_EXTENSION_ID_HERE'; // Replace after uploading to Chrome Web Store, or use unpacked ID
const HOST_NAME = 'com.scout.bridge';

function getBrowserDirs() {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === 'win32') {
    return {
      chrome: path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'NativeMessagingHosts'),
      edge: path.join(home, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'NativeMessagingHosts')
    };
  }
  if (platform === 'darwin') {
    return {
      chrome: path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts'),
      edge: path.join(home, 'Library', 'Application Support', 'Microsoft Edge', 'NativeMessagingHosts')
    };
  }
  // Linux
  return {
    chrome: path.join(home, '.config', 'google-chrome', 'NativeMessagingHosts'),
    edge: path.join(home, '.config', 'microsoft-edge', 'NativeMessagingHosts')
  };
}

function install() {
  const bridgePath = path.resolve(__dirname, 'index.js');
  const dirs = getBrowserDirs();

  const manifest = {
    name: HOST_NAME,
    description: 'Scout local AI bridge',
    path: bridgePath,
    type: 'stdio',
    allowed_origins: [
      `chrome-extension://${EXTENSION_ID}/`
    ]
  };

  // Also support development with any unpacked extension
  // Chrome assigns random IDs to unpacked extensions, so we provide a helper
  console.log('='.repeat(50));
  console.log('Scout Bridge Installer');
  console.log('='.repeat(50));
  console.log('\nIMPORTANT: Unpacked extensions get random IDs.');
  console.log('1. Go to chrome://extensions/');
  console.log('2. Copy your Scout extension ID');
  console.log('3. Edit this file and replace YOUR_EXTENSION_ID_HERE\n');

  let installedAny = false;
  for (const [browser, dir] of Object.entries(dirs)) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.warn(`Could not create ${browser} dir:`, e.message);
        continue;
      }
    }
    const dest = path.join(dir, `${HOST_NAME}.json`);
    fs.writeFileSync(dest, JSON.stringify(manifest, null, 2));
    console.log(`✅ Installed manifest for ${browser}: ${dest}`);
    installedAny = true;
  }

  if (installedAny) {
    console.log('\n✨ Installation complete!');
    console.log('Restart your browser for changes to take effect.');
    console.log('\nTo test Ollama connection:');
    console.log('  node index.js --once');
    console.log('Then paste a JSON message and press Ctrl+D\n');
  } else {
    console.log('\n❌ Could not install to any browser directory.');
    console.log('You may need to run this script with appropriate permissions.\n');
  }
}

// Alternative: generate a registry script for Windows
function generateWindowsReg() {
  const bridgePath = path.resolve(__dirname, 'index.js').replace(/\\/g, '\\\\');
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.scout.bridge]
@="${bridgePath}.json"
`;
  fs.writeFileSync(path.join(__dirname, 'install-windows.reg'), regContent);
  console.log('Generated install-windows.reg (for manual registry entry if needed)');
}

if (require.main === module) {
  install();
  if (os.platform() === 'win32') generateWindowsReg();
}
