import { SlashCommandBuilder, REST, Routes } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('dream-combine')
    .setDescription('Combine two dream NFTs into a remix (50:50 royalty split)')
    .addStringOption((o) =>
      o.setName('parent_a').setDescription('First dream NFT token ID').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('parent_b').setDescription('Second dream NFT token ID').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('title').setDescription('Title for the combined dream').setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName('simulacrum')
    .setDescription('Get link to explore a dream in 3D')
    .addStringOption((o) =>
      o.setName('dream_id').setDescription('Dream journal ID').setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('xael-price')
    .setDescription('Show XAEL exchange demo spot for a commodity')
    .addStringOption((o) =>
      o
        .setName('commodity')
        .setDescription('XAEL, ENERGY, DATA, or COMPUTE')
        .setRequired(true)
        .addChoices(
          { name: 'XAEL', value: 'XAEL' },
          { name: 'Energy', value: 'ENERGY' },
          { name: 'Data', value: 'DATA' },
          { name: 'Compute', value: 'COMPUTE' },
        ),
    ),
].map((c) => c.toJSON());

export async function registerCommands(token: string, clientId: string, guildId?: string) {
  const rest = new REST({ version: '10' }).setToken(token);
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Registered ${commands.length} guild commands for ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`Registered ${commands.length} global commands`);
  }
}