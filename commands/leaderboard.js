const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserMessageCount = require('../schemas/userMessageCount');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View leaderboards for messages and points')
    .addSubcommand(subcommand =>
      subcommand
        .setName('messages')
        .setDescription('View the top 10 members by message count')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of leaderboard')
            .setRequired(true)
            .addChoices(
              { name: 'Global', value: 'global' },
              { name: 'Server', value: 'server' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('points')
        .setDescription('View the top 10 members by points')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of leaderboard')
            .setRequired(true)
            .addChoices(
              { name: 'Global', value: 'global' },
              { name: 'Server', value: 'server' }
            )
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const type = interaction.options.getString('type');
    const guildId = interaction.guild ? interaction.guild.id : null;

    let leaderboardData;

    switch (subcommand) {
      case 'messages':
        leaderboardData = type === 'global'
          ? await getGlobalLeaderboard('messageCount')
          : await getServerLeaderboard(guildId, 'messageCount');
        break;

      case 'points':
        leaderboardData = type === 'global'
          ? await getGlobalLeaderboard('points')
          : await getServerLeaderboard(guildId, 'points');
        break;

      default:
        return interaction.reply({ content: ':x: **Invalid subcommand provided.**', ephemeral: true });
    }

    if (!leaderboardData.length) {
      return interaction.reply({ content: `:x: **No leaderboard data found for** \`${type === 'global' ? 'global' : 'this server'}\` **leaderboard**.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#f8aa35')
      .setTitle(`**${type.charAt(0).toUpperCase() + type.slice(1)} ${subcommand} leaderboard**`);

    if (type === 'server' && interaction.guild) {
      embed.setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) });
    }

    let description = '';

    for (let i = 0; i < leaderboardData.length; i++) {
      const entry = leaderboardData[i];
      const username = entry.username || 'Unknown';
      const userLink = `https://discord.com/users/${entry.userId}`;
      const formattedValue = subcommand === 'messages' ? entry.messageCount.toLocaleString() : entry.points.toLocaleString();

      // Fetch user message data including purchased items across all guilds
      const userMessageData = await UserMessageCount.find({ userId: entry.userId });
      let allPurchasedItems = [];

      userMessageData.forEach(data => {
        allPurchasedItems = allPurchasedItems.concat(data.purchasedItems);
      });

      // Remove duplicates
      const uniquePurchasedItems = [...new Set(allPurchasedItems)];

      // Add badges to the description
      const badges = uniquePurchasedItems.length > 0 ? `${uniquePurchasedItems.join(', ')}` : '';

      description += `**\` ${i + 1} \`** **[${username}](${userLink})** ${badges} • ${formattedValue}\n`;
    }

    embed.setDescription(description);

    await interaction.reply({ embeds: [embed] });
  },
};

async function getGlobalLeaderboard(sortField) {
  const pipeline = [
    { $group: { _id: '$userId', data: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$data' } },
    { $sort: { [sortField]: -1 } },
    { $limit: 10 }
  ];
  return await UserMessageCount.aggregate(pipeline);
}

async function getServerLeaderboard(guildId, sortField) {
  const pipeline = [
    { $match: { guildId } },
    { $group: { _id: '$userId', data: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$data' } },
    { $sort: { [sortField]: -1 } },
    { $limit: 10 }
  ];
  return await UserMessageCount.aggregate(pipeline);
}
