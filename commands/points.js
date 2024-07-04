const { SlashCommandBuilder } = require('discord.js');
const UserMessageCount = require('../schemas/userMessageCount'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your accumulated points'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const userMessageData = await UserMessageCount.findOne({ userId, guildId });

    if (!userMessageData) {
      return interaction.reply({ content: ':x: **You have no points yet.**', ephemeral: true });
    }

    await interaction.reply(`You have earned a total of **${userMessageData.points}** points.`);
  },
};
