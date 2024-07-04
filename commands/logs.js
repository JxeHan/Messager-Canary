const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
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
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand.setName('remove')
            .setDescription('Remove the log channel'))),

  async execute(interaction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'message') {
      if (subcommand === 'channel') {
        // Handle setting the log channel
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        try {
          // Check if a log channel is already set for this guild
          const existingLogChannel = await LogChannel.findOne({ guildId });
          if (existingLogChannel) {
            return interaction.reply('❌ **Log channel is already set. Remove the existing log channel before setting a new one.**');
          }

          // Create the webhook
          const webhook = await channel.createWebhook({
            name: `${interaction.client.user.username} Logs`,
            avatar: interaction.client.user.displayAvatarURL(),
          });

          // Send a test message through the webhook
          const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
          const testEmbed = new EmbedBuilder()
            .setColor('#f8aa35')
            .setTitle('**Message logging**')
            .setDescription('This channel will now be for message logging only, if you would like to remove this please use \`/log message remove\`')
            .addFields(
                { name: '**What events do we log?**', value: '`MessageCreate` • When you send a message.\n`MessageDelete` • When you delete a message.\n`MessageUpdate` • When you edit a message.'}
            )
          
          await webhookClient.send({ embeds: [testEmbed] });

          // Update or create the log channel entry
          await LogChannel.findOneAndUpdate(
            { guildId },
            { channelId: channel.id, webhookId: webhook.id, webhookToken: webhook.token },
            { upsert: true, new: true }
          );

          await interaction.reply(`✅ **Log channel has been set to** \`${channel.name}\`.`);
        } catch (error) {
          console.error('Error creating webhook:', error);
          return interaction.reply({ content: '❌ **Failed to create webhook for the specified channel.**', ephemeral: true });
        }
      } else if (subcommand === 'remove') {
        // Handle removing the log channel
        const guildId = interaction.guild.id;

        try {
          const logChannelData = await LogChannel.findOneAndDelete({ guildId });

          if (!logChannelData) {
            return interaction.reply('❌ **Log channel is not currently set.**');
          }

          await interaction.reply('✅ **Log channel has been removed.**');
        } catch (error) {
          console.error('Error removing log channel:', error);
          return interaction.reply({ content: '❌ **Failed to remove log channel.**', ephemeral: true });
        }
      }
    }
  },
};
