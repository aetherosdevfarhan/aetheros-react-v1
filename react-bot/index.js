require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const OWNER_ID = process.env.OWNER_ID?.trim();
const REACT_EMOJIS = (process.env.REACT_EMOJIS || '😆')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

if (!OWNER_ID) {
  console.error('[REACT-BOT] OWNER_ID is missing from your .env file. Set it and restart.');
  process.exit(1);
}

client.once('ready', () => {
  console.log(`[REACT-BOT] Logged in as ${client.user.tag}`);
  console.log(`[REACT-BOT] Will react only to messages from OWNER_ID=${OWNER_ID}`);
  console.log(`[REACT-BOT] Reacting with: ${REACT_EMOJIS.join(' ')}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.id !== OWNER_ID) return;
  if (message.author.bot) return;

  for (const emoji of REACT_EMOJIS) {
    await message.react(emoji).catch((err) => {
      console.warn(`[REACT-BOT] Failed to react with ${emoji}: ${err.message}`);
    });
  }
});

process.on('unhandledRejection', (err) => {
  console.error('[REACT-BOT] Unhandled rejection:', err);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[REACT-BOT] DISCORD_TOKEN is missing from your .env file.');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('[REACT-BOT] Failed to log in:', err.message);
  process.exit(1);
});
