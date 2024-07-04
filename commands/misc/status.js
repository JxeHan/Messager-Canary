const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the status of Messager systems'),
  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle('**Messager Status**')
      .setDescription('Message Tracking: ✅\nGlobal Leaderbaords: ✅\nServer Leaderboards: ✅\nMember Profiles: ✅\nPoint Tracking: ✅\nPremium: ❌\n\n5 Systems Operational, 1 System Offline.')
      .setColor('#f8aa35')

    await interaction.reply({ embeds: [embed] });
  },
};
