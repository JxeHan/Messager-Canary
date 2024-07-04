const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const checkPremium = require('../../utils/premium'); // Adjust the path to your middleware

const UserMessageCount = require('../../schemas/userMessageCount'); // Adjust the path as per your file structure

module.exports = {
  premium: true,  // Indicates that this command requires premium access
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Check if you have premium (In testing)'),
  async execute(interaction) {
    const hasPremium = await checkPremium(interaction);
    if (!hasPremium) return;

    const user = interaction.user;

    try {
      const userData = await UserMessageCount.findOne({ userId: user.id });

      if (userData && userData.premium) {
        const embed = new EmbedBuilder()
          .setTitle('**Premium Status**')
          .setDescription('✅ You have premium.')
          .setColor('#f8aa35');

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('**Premium Status**')
          .setDescription('❌ You do not have premium.')
          .setColor('#f8aa35');

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      await interaction.reply({ content: '❌ Error checking premium status.', ephemeral: true });
    }
  },
};
