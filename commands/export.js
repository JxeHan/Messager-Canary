const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const UserMessageCount = require('../schemas/userMessageCount');

module.exports = {
  cooldown: 5,
  clientPerms: ['ManageMessages'],
  data: new SlashCommandBuilder()
    .setName('export')
    .setDescription('Export messages from a channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to export messages from')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('format')
        .setDescription('The format of the export file')
        .setRequired(true)
        .addChoices(
          { name: 'Text', value: 'txt' },
          { name: 'JSON', value: 'json' }
        )
    )
    .addIntegerOption(option =>
      option.setName('messages')
        .setDescription('The number of messages to export (1-100)')
        .setRequired(true)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const format = interaction.options.getString('format');
    let number = interaction.options.getInteger('messages');
    const user = interaction.user;

    if (!channel.isTextBased()) {
      return interaction.reply({ content: ':warning: **Please select a valid** text channel.', ephemeral: true });
    }

    number = Math.min(Math.max(number, 1), 100);

    await interaction.deferReply({ ephemeral: true });

    const messages = await channel.messages.fetch({ limit: number });
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let fileContent = '';

    if (format === 'txt') {
      sortedMessages.forEach(message => {
        fileContent += `[${message.createdAt.toLocaleString()}] ${message.author.tag}: ${message.content}\n`;
      });
    } else if (format === 'json') {
      const jsonMessages = sortedMessages.map(message => ({
        author: message.author.tag,
        content: message.content,
        timestamp: message.createdAt
      }));
      fileContent = JSON.stringify(jsonMessages, null, 2);
    }

    const fileName = `export.${format}`;
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, fileContent);

    const embed = new EmbedBuilder()
      .setTitle('**Export Complete**')
      .setDescription(`Your exported **${format}** file is ready for download.`)
      .setColor('#f8aa35');

    const dmChannel = await user.createDM();
    await dmChannel.send({
      embeds: [embed]
    });

    await dmChannel.send({
      files: [{ attachment: filePath, name: fileName }]
    });

    fs.unlinkSync(filePath);

    await interaction.editReply({ content: '**Messages exported and sent via DM.**', ephemeral: true });
  },
};
