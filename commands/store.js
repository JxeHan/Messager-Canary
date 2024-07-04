const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const UserMessageCount = require('../schemas/userMessageCount');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('store')
    .setDescription('View items available for purchase with your points'),

  async execute(interaction) {
    const userId = interaction.user.id;

    let userData = await UserMessageCount.findOne({ userId });

    if (!userData) {
      userData = await UserMessageCount.create({
        userId,
        username: interaction.user.username,
        messageCount: 0,
        points: 0,
        purchasedItems: []
      });
    }

    const items = [
      { name: '500mBadge', points: 50, emoji: '1257127606680289343' },
    ];

    const buttons = items.map(item => {
      const button = new ButtonBuilder()
        .setCustomId(`buy_${item.name.toLowerCase().replace(/\s/g, '')}`)
        .setLabel(`${item.points} Points`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(item.emoji);

      if (userData.purchasedItems.includes(`<:${item.name}:${item.emoji}>`)) {
        button.setDisabled(false); 
      }

      return button;
    });

    const row = new ActionRowBuilder().addComponents(buttons);

    const embed = new EmbedBuilder()
      .setColor('#f8aa35')
      .setTitle('**Messenger Store**')
      .setDescription(items.map(item => `**${item.points} Points:** <:${item.name}:${item.emoji}>`).join('\n'))
      .setFooter({ text: 'More items will be added soon. Use /profile to see your items.' });

    const reply = await interaction.reply({ content: `You have a total of **${userData.points}** points to spend.`, embeds: [embed], components: [row], ephemeral: true, fetchReply: true });

    const filter = i => i.user.id === userId && i.isButton();
    const collector = reply.createMessageComponentCollector({ filter });

    collector.on('collect', async buttonInteraction => {
      const itemName = buttonInteraction.customId.replace('buy_', '').toLowerCase();
      const selectedItem = items.find(item => item.name.toLowerCase().replace(/\s/g, '') === itemName);

      if (!selectedItem) return;

      if (userData.purchasedItems.includes(`<:${selectedItem.name}:${selectedItem.emoji}>`)) {
        await buttonInteraction.reply({ content: `**You already own** \`${selectedItem.name}\`.`, ephemeral: true });
        return;
      }

      if (userData.points >= selectedItem.points) {
        userData.points -= selectedItem.points;
        const badgeString = `<:${selectedItem.name}:${selectedItem.emoji}>`;
        userData.purchasedItems.push(badgeString);
        await userData.save();

        await buttonInteraction.reply({ content: `**You have successfully purchased** \`${selectedItem.name}\`.`, ephemeral: true });
      } else {
        await buttonInteraction.reply({ content: `**You do not have enough points to purchase** \`${selectedItem.name}\`.`, ephemeral: true });
      }
    });

    collector.on('end', () => {
      if (!reply.deleted) {
        reply.edit({ components: [] });
      }
    });
  },
};
