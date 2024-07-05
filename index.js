const { Client, GatewayIntentBits, Events, Collection, Partials, WebhookClient, EmbedBuilder, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const UserMessageCount = require('./schemas/userMessageCount'); // Adjust the path as necessary
const LogChannel = require('./schemas/logChannel'); // Adjust path as necessary

const PREFIX = '.';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.config = require('./config.json');
client.logs = require('./utils/logs.js');
client.cooldowns = new Map();
client.commands = new Collection();
client.messages = new Collection();
client.modals = new Collection();

require('./utils/components.js')(client);
require('./utils/events.js')(client);
require('./utils/commands.js')(client);

client.logs.info(`Logging in...`);

client.login(client.config.TOKEN);

client.on('ready', async () => {
    client.logs.success(`Logged in as: ${client.user.tag}`);
    mongoose.connect(client.config.DATABASE)
        .then(() => client.logs.info('Successfully connected to MongoDB'))
        .catch(err => client.logs.error('Failed to connect to MongoDB', err));
    mongoose.set('strictQuery', false);

    async function updatePresence() {
        client.user.setPresence({
            activities: [{ name: `/help`, type: ActivityType.Listening }],
            status: 'online',
        });
    }

    await updatePresence();
    setInterval(updatePresence, 4000);
});

function CheckAccess(requiredRoles, userIDs, member, user) {
  if (member && requiredRoles) {
      const hasRole = requiredRoles.some(roleID => member.roles.cache.has(roleID));
      if (!hasRole && !member.permissions.has('Administrator')) {
          throw 'Missing roles';
      }
  }

  if (userIDs) {
      if (!userIDs.includes(user.id) && !member.permissions.has('Administrator')) {
          throw 'Missing user whitelist';
      }
  }
}

function CheckPermissions(permissionsArray, member) {
  if (!Array.isArray(permissionsArray)) return;

  const missingPermissions = [];
  if (member && permissionsArray.length > 0) {
      for (const permission of permissionsArray) {
          if (member.permissions.has(permission)) continue;
          missingPermissions.push(permission);
      }
  }

  if (missingPermissions.length > 0) throw missingPermissions.join(', ');
}

function CheckCooldown(user, command, cooldown) {
    // Only apply cooldown if it is explicitly set
    if (cooldown === undefined) return;
  
    const cooldownKey = `${user.id}-${command}`;
    if (client.cooldowns.has(cooldownKey)) {
        const expiration = client.cooldowns.get(cooldownKey);
        if (expiration > Date.now()) {
            const remaining = Math.ceil((expiration - Date.now()) / 1000); // Remaining time in whole seconds
            const expirationTimestamp = Math.floor(expiration / 1000); // Convert to seconds
            throw `⏱️ **${user.tag} you are on cooldown.** Please wait until <t:${expirationTimestamp}:R> before running \`/${command}\` again.`;
        }
    }
    client.cooldowns.set(cooldownKey, Date.now() + cooldown * 1000);
}

async function InteractionHandler(interaction, type) {
  const args = interaction.customId?.split("_") ?? [];
  const name = args.shift();

  interaction.deferUpdate ??= interaction.deferReply;

  const component = client[type].get(name ?? interaction.commandName);
  if (!component) {
      await interaction.reply({
          content: `**There was an error while interacting with \`${type}\`.`,
          ephemeral: false
      }).catch(() => { });
      client.logs.error(`${type} not found: ${interaction.customId}`);
      return;
  }

  try {
      CheckAccess(component.roles, component.users, interaction.member, interaction.user);
  } catch (reason) {
      await interaction.reply({
          content: ":x: **You don't have permission to use this command.**",
          ephemeral: false
      }).catch(() => { });
      return;
  }

  try {
      CheckCooldown(interaction.user, component.customID ?? interaction.commandName, component.cooldown);
  } catch (reason) {
      await interaction.reply({
          content: reason,
          ephemeral: false
      }).catch(() => { });
      return;
  }

  try {
      CheckPermissions(component.userPerms, interaction.member);
  } catch (permissions) {
      await interaction.reply({ content: `:x: **You require the permissions:** \`${permissions}\``, ephemeral: false }).catch(() => { });
      return;
  }

  try {
      const botMember = interaction.guild.members.cache.get(client.user.id) ?? await interaction.guild.members.fetch(client.user.id);
      CheckPermissions(component.clientPerms, botMember);
  } catch (permissions) {
    await interaction.reply({ content: `:x: **Messager requires the permissions:** \`${permissions}\``,  ephemeral: false }).catch(() => { });
    return;
  }

  try {
      if (interaction.isAutocomplete()) {
          await component.autocomplete(interaction, client, type === 'commands' ? undefined : args);
      } else {
          await component.execute(interaction, client, type === 'commands' ? undefined : args);
      }
  } catch (error) {
      client.logs.error(error.stack);
      await interaction.deferReply({ ephemeral: false }).catch(() => { });
      await interaction.editReply({
          content: `Command execution error:\n\`\`\`${error}\`\`\``,
          embeds: [],
          components: [],
          files: [],
          ephemeral: false
      }).catch(() => { });
  }
}

client.on('interactionCreate', async function (interaction) {
  if (interaction.isCommand() || interaction.isAutocomplete()) {
      await InteractionHandler(interaction, 'commands');
  } else if (interaction.isModalSubmit()) {
      await InteractionHandler(interaction, 'modals');
  }
});

client.on('messageCreate', async function (message) {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).split(/\s+/);
  const name = args.shift().toLowerCase();

  const command = client.messages.get(name);
  if (!command) {
      //client.logs.error(`Command not found: ${name}`);
      return await message.reply(`:x: **Command execution error.**`).catch(() => { });
  }

  try {
      CheckAccess(command.roles, command.users, message.member, message.author);
  } catch (reason) {
      //await message.reply(":x: **You don't have permission to use this command.**").catch(() => { });
      return;
  }

  try {
      CheckCooldown(message.author, name, command.cooldown);
  } catch (reason) {
      await message.reply(reason).catch(() => { });
      return;
  }

  try {
      CheckPermissions(command.userPerms, message.member);
  } catch (permissions) {
    await message.reply({ content: `:x: **You require the permissions:** \`${permissions}\``, ephemeral: false }).catch(() => { });
    return;
  }

  try {
      CheckPermissions(command.clientPerms, message.guild.members.me);
  } catch (permissions) {
      await message.reply({ content: `:x: **Messager requires the permissions:** \`${permissions}\``,  ephemeral: false }).catch(() => { });
      return;
  }

  try {
      await command.execute(message, client, args);
  } catch (error) {
      client.logs.error(error.stack);
      await message.reply(`Command execution error!\n\`\`\`${error}\`\`\``).catch(() => { });
  } finally {
      client.cooldowns.set(message.author.id, Date.now() + command.cooldown * 1000);
      setTimeout(() => client.cooldowns.delete(message.author.id), command.cooldown * 1000);
  }
});

// Function to delay execution for a given time
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to send log message with delay
async function sendLogWithDelay(webhookClient, embed) {
  try {
    await webhookClient.send({ embeds: [embed] });
    await delay(3000); // Delay of 1 second (1000 milliseconds)
  } catch (error) {
    console.error('Error sending log message:', error);
  }
}

// Log edited messages
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot || oldMessage.content === newMessage.content) return; // Skip messages that are not in guilds, from bots, or if content didn't change

  const logChannelData = await LogChannel.findOne({ guildId: oldMessage.guild.id });
  if (!logChannelData) return; // Log channel not set

  const { webhookId, webhookToken } = logChannelData;

  try {
    const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

    const messageLink = `https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}`;
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('<:BluePen:1258523096625971282> **Message Edited**')
      .setURL(messageLink)
      .setAuthor({ name: `${oldMessage.author.tag} • ${oldMessage.author.id}`, iconURL: oldMessage.author.displayAvatarURL() })
      .setDescription(`**Old Content:** \`\`\`${oldMessage.content}\`\`\`\n**New Content:** \`\`\`${newMessage.content}\`\`\``)
      .addFields(
        { name: '**Channel**', value: oldMessage.channel.toString(), inline: false },
        { name: '**Message ID**', value: oldMessage.id, inline: false },
        { name: '**Message Edited**', value: `<t:${Math.floor(newMessage.editedAt.getTime() / 1000)}:F> (<t:${Math.floor(newMessage.editedAt.getTime() / 1000)}:R>)`, inline: false }
      );

    await sendLogWithDelay(webhookClient, embed);
  } catch (error) {
    console.error('Error sending log message:', error);
  }
});

// Log deleted messages
client.on('messageDelete', async message => {
  if (!message.guild || !message.author || message.author.bot) return; // Skip messages that are not in guilds, have no author, or are from bots

  const logChannelData = await LogChannel.findOne({ guildId: message.guild.id });
  if (!logChannelData) return; // Log channel not set

  const { webhookId, webhookToken } = logChannelData;

  try {
    const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('<:RedBin:1258521847771955290> **Message Deleted**')
      .setAuthor({ name: `${message.author.tag} • ${message.author.id}`, iconURL: message.author.displayAvatarURL() })
      .setDescription(`**Content:** \`\`\`${message.content}\`\`\``)
      .addFields(
        { name: '**Channel**', value: message.channel.toString(), inline: false },
        { name: '**Message ID**', value: message.id, inline: false },
        { name: '**Message Deleted**', value: `<t:${Math.floor(new Date().getTime() / 1000)}:F> (<t:${Math.floor(new Date().getTime() / 1000)}:R>)`, inline: false }
      );

    await sendLogWithDelay(webhookClient, embed);
  } catch (error) {
    console.error('Error sending log message:', error);
  }
});
