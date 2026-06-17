import 'dotenv/config';
import { registerCommands } from './commands.js';

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID required');
  process.exit(1);
}

await registerCommands(token, clientId, guildId);
console.log('Done.');