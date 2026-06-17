import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { registerCommands } from './commands.js';

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const appUrl = process.env.EVERDREAM_APP_URL || 'https://everdream.app';
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

if (!token || !clientId) {
  console.error('DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required');
  process.exit(1);
}

const DEMO_PRICES: Record<string, number> = {
  XAEL: 12,
  ENERGY: 3.5,
  DATA: 0.8,
  COMPUTE: 18,
};

async function postWebhook(embed: ReturnType<EmbedBuilder['toJSON']>) {
  if (!webhookUrl?.startsWith('https://discord.com/api/webhooks')) return;
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

async function handleDreamCombine(interaction: ChatInputCommandInteraction) {
  const parentA = interaction.options.getString('parent_a', true);
  const parentB = interaction.options.getString('parent_b', true);
  const title = interaction.options.getString('title') || `Remix ${parentA} × ${parentB}`;

  const embed = new EmbedBuilder()
    .setTitle('🔀 Dream Combine Queued')
    .setDescription(`**${title}**`)
    .addFields(
      { name: 'Parent A', value: parentA, inline: true },
      { name: 'Parent B', value: parentB, inline: true },
      { name: 'Requester', value: interaction.user.tag, inline: true },
    )
    .setColor(0xf39c12)
    .setFooter({ text: 'EverDream · 50:50 royalty split on mint' });

  await postWebhook(embed.toJSON());
  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

async function handleSimulacrum(interaction: ChatInputCommandInteraction) {
  const dreamId = interaction.options.getString('dream_id', true);
  const url = `${appUrl}/#/simulacrum/${dreamId}`;

  const embed = new EmbedBuilder()
    .setTitle('🌙 Dream Simulacrum')
    .setDescription(`Explore dream \`${dreamId}\` in 3D`)
    .setURL(url)
    .setColor(0x5a7a5a);

  await interaction.reply({ embeds: [embed] });
}

async function handleXaelPrice(interaction: ChatInputCommandInteraction) {
  const commodity = interaction.options.getString('commodity', true);
  const price = DEMO_PRICES[commodity] ?? 10;

  const embed = new EmbedBuilder()
    .setTitle('📊 XAEL Exchange (demo)')
    .setDescription(`**${commodity}** spot: **${price}** XAEL`)
    .setURL(`${appUrl}/#/exchange`)
    .setColor(0x7a9e7a)
    .setFooter({ text: 'Local ledger · on-chain settlement planned' });

  await interaction.reply({ embeds: [embed] });
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`EverDream bot logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'dream-combine':
        await handleDreamCombine(interaction);
        break;
      case 'simulacrum':
        await handleSimulacrum(interaction);
        break;
      case 'xael-price':
        await handleXaelPrice(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
  } catch (e) {
    console.error('[bot] command error', e);
    const msg = e instanceof Error ? e.message : 'Command failed';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: msg, ephemeral: true });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
});

await registerCommands(token, clientId, guildId);
await client.login(token);