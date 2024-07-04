// commands/log.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const LogChannel = require('../schemas/logChannel'); // Adjust the path as necessary

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Manage logging settings')
    .addSubcommandGroup(group => 
      group.setName('message')
        .setDescription('Message logging settings')
        .addSubcommand(subcommand =>
          subcommand.setName('channel')
            .setDescription('Set the channel for logging messages')
            .addChannelOption(option => 
              option.setName('channel')
                .setDescription('The channel to log messages in')
                .setRequired(true)))),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    try {
      // Create the webhook
      const webhook = await channel.createWebhook({
        name: `${interaction.client.user.username} Logs`,
        avatar: interaction.client.user.displayAvatarURL(),
      });

      // Update or create the log channel entry
      await LogChannel.findOneAndUpdate(
        { guildId },
        { channelId: channel.id, webhookId: webhook.id, webhookToken: webhook.token },
        { upsert: true, new: true }
      );

      await interaction.reply(`✅ Log channel has been set to ${channel.toString()}`);
    } catch (error) {
      console.error('Error creating webhook:', error);
      return interaction.reply({ content: '❌ Failed to create webhook for the specified channel.', ephemeral: true });
    }
  },
};
