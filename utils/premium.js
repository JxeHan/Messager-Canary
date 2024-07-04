const { EmbedBuilder } = require('discord.js');
const UserMessageCount = require('../schemas/userMessageCount'); // Adjust the path as per your file structure

async function checkPremium(interaction) {
  const user = interaction.user;

  try {
    const userData = await UserMessageCount.findOne({ userId: user.id });

    if (userData && userData.premium) {
      return true; 
    } else {
      const embed = new EmbedBuilder()
        .setTitle('**Premium Required (Coming Soon)**')
        .setDescription('❌ You do not have premium access to use this command.')
        .setColor('#f8aa35');

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return false; 
    }
  } catch (error) {
    console.error('Error checking premium status:', error);
    await interaction.reply({ content: '❌ Error checking premium status.', ephemeral: true });
    return false; 
  }
}

module.exports = checkPremium;
