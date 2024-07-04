const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserMessageCount = require('../schemas/userMessageCount');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Showcase member profile')
    .addUserOption(option => 
      option.setName('member')
        .setDescription('The member to get the profile for')
        .setRequired(false)
    )
    .addStringOption(option => 
      option.setName('id')
        .setDescription('The ID of the member')
        .setRequired(false)
    ),
  async execute(interaction) {
    const memberOption = interaction.options.getUser('member');
    const idOption = interaction.options.getString('id');
    
    const user = idOption ? await interaction.client.users.fetch(idOption) : (memberOption || interaction.user);
    const userId = user.id;
    const guildId = interaction.guild.id;

    const userMessageData = await UserMessageCount.findOne({ userId, guildId });

    if (!userMessageData) {
      return interaction.reply({ content: `:x: **No data found for** \`${user.username}\`.`, ephemeral: true });
    }

    const messageCount = userMessageData ? userMessageData.messageCount : 0;
    const points = userMessageData ? userMessageData.points : 0;
    const purchasedItems = userMessageData ? userMessageData.purchasedItems : [];

    const embed = new EmbedBuilder()
      .setColor('#f8aa35')
      .setTitle(`**@${user.username}**`)
      .setURL(`https://discordapp.com/users/${userId}`) // Adding URL to the user's profile
      .setImage(user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: '**Total Messages**', value: messageCount.toLocaleString(), inline: true },
        { name: '**Points**', value: points.toLocaleString(), inline: true }
      );

    if (purchasedItems.length > 0) {
      embed.addFields({ name: '**Items**', value: purchasedItems.map(item => `${item}`).join(' '), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
