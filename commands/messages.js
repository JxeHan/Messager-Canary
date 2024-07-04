const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserMessageCount = require('../schemas/userMessageCount');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messages')
    .setDescription('Showcase your own messages')
    .addUserOption(option =>
      option.setName('member')
        .setDescription('Select a member to showcase messages')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('id')
        .setDescription('The ID of member to showcase messages')
        .setRequired(false)
    ),
  async execute(interaction) {
    const idOption = interaction.options.getString('id');
    const userOption = interaction.options.getUser('member');
    const user = idOption ? await interaction.client.users.fetch(idOption) : (userOption || interaction.user);

    let userMessageData = await UserMessageCount.findOne({ userId: user.id });

    if (!userMessageData) {
      userMessageData = await UserMessageCount.create({
        userId: user.id,
        username: user.username,
        guildId: interaction.guild.id,
        messageCount: 0,
        lastMessage: { content: '', timestamp: new Date() }
      });
    }

    const lastMessage = userMessageData.lastMessage;
    const totalMessages = userMessageData.messageCount;
    const lastMessageTimestamp = Math.floor(new Date(lastMessage.timestamp).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor('#f8aa35')
      .setThumbnail(user.displayAvatarURL())
      .setTitle(`**@${user.username}**`)
      .setURL(`https://discordapp.com/users/${user.id}`) // Adding URL to the user's profile
      .addFields(
        { name: '**Total Messages**', value: `${totalMessages.toLocaleString()}`, inline: false },
        { name: '**Last Sent Message**', value: `<t:${lastMessageTimestamp}:F> (<t:${lastMessageTimestamp}:R>)`, inline: false },
        { name: '**Content**', value: `\`\`\`${lastMessage.content}\`\`\``, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
