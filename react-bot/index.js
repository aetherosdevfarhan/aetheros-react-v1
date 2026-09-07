require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const OWNER_IDS = (process.env.OWNER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const REACT_EMOJIS = (process.env.REACT_EMOJIS || '😆')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

const IGNORE_BOTS = (process.env.IGNORE_BOTS ?? 'true').toLowerCase() !== 'false';
const PREFIX = process.env.COMMAND_PREFIX || '*';

if (OWNER_IDS.length === 0) {
  console.error('[REACT-BOT] OWNER_IDS is missing or empty in your .env file. Set at least one user ID and restart.');
  process.exit(1);
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[REACT-BOT] DISCORD_TOKEN is missing from your .env file.');
  process.exit(1);
}

// --- on/off state, persisted to disk so it survives restarts ---
const STATE_FILE = path.join(__dirname, 'state.json');

function loadEnabled() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).enabled ?? true;
  } catch {
    return true; // default: on
  }
}

function saveEnabled(enabled) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ enabled }, null, 2));
}

let enabled = loadEnabled();

// Custom emoji written as <:name:id> or <a:name:id> -- discord.js wants just the ID.
const CUSTOM_EMOJI_REGEX = /^<a?:([a-zA-Z0-9_]+):(\d+)>$/;

function resolveEmoji(input) {
  const match = input.match(CUSTOM_EMOJI_REGEX);
  return match ? match[2] : input; // custom emoji -> its ID, otherwise assume unicode
}

client.once('ready', () => {
  console.log(`[REACT-BOT] Logged in as ${client.user.tag}`);
  console.log(`[REACT-BOT] Will react only to messages from: ${OWNER_IDS.join(', ')}`);
  console.log(`[REACT-BOT] Reacting with: ${REACT_EMOJIS.join(' ')}`);
  console.log(`[REACT-BOT] Currently ${enabled ? 'ON' : 'OFF'} (command prefix: ${PREFIX})`);
});

client.on('messageCreate', async (message) => {
  const content = message.content.trim().toLowerCase();

  // --- toggle command: only the owners themselves can flip it ---
  if (content === `${PREFIX}autoreact on` || content === `${PREFIX}autoreact off`) {
    if (!OWNER_IDS.includes(message.author.id)) return; // silently ignore anyone else
    enabled = content.endsWith('on');
    saveEnabled(enabled);
    await message.reply(`Auto-react is now **${enabled ? 'ON' : 'OFF'}**.`).catch(() => {});
    return;
  }

  if (!enabled) return;
  if (!OWNER_IDS.includes(message.author.id)) return;
  if (IGNORE_BOTS && message.author.bot) return;

  for (const emoji of REACT_EMOJIS) {
    try {
      await message.react(resolveEmoji(emoji));
    } catch (err) {
      console.warn(`[REACT-BOT] Failed to react with ${emoji}: ${err.message}`);
    }
  }
});

client.on('error', (err) => {
  console.error('[REACT-BOT] Client error:', err);
});

client.on('shardError', (err) => {
  console.error('[REACT-BOT] Shard connection error:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[REACT-BOT] Unhandled rejection:', err);
});

async function shutdown(signal) {
  console.log(`[REACT-BOT] Received ${signal}, shutting down...`);
  client.destroy();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(token).catch((err) => {
  console.error('[REACT-BOT] Failed to log in:', err.message);
  process.exit(1);
});
