const { Client, GatewayIntentBits, Events, Collection, Partials, WebhookClient, EmbedBuilder, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const UserMessageCount = require('./schemas/userMessageCount'); // Adjust the path as necessary

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
    mongoose.set('strictQuery', true);

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
          ephemeral: true
      }).catch(() => { });
      client.logs.error(`${type} not found: ${interaction.customId}`);
      return;
  }

  try {
      CheckAccess(component.roles, component.users, interaction.member, interaction.user);
  } catch (reason) {
      await interaction.reply({
          content: ":x: **You don't have permission to use this command.**",
          ephemeral: true
      }).catch(() => { });
      return;
  }

  try {
      CheckCooldown(interaction.user, component.customID ?? interaction.commandName, component.cooldown);
  } catch (reason) {
      await interaction.reply({
          content: reason,
          ephemeral: true
      }).catch(() => { });
      return;
  }

  try {
      CheckPermissions(component.userPerms, interaction.member);
  } catch (permissions) {
      await interaction.reply({ content: `:x: **You require the permissions:** \`${permissions}\``, ephemeral: true }).catch(() => { });
      return;
  }

  try {
      const botMember = interaction.guild.members.cache.get(client.user.id) ?? await interaction.guild.members.fetch(client.user.id);
      CheckPermissions(component.clientPerms, botMember);
  } catch (permissions) {
    await interaction.reply({ content: `:x: **Messager requires the permissions:** \`${permissions}\``,  ephemeral: true }).catch(() => { });
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
      await interaction.deferReply({ ephemeral: true }).catch(() => { });
      await interaction.editReply({
          content: `Command execution error:\n\`\`\`${error}\`\`\``,
          embeds: [],
          components: [],
          files: [],
          ephemeral: true
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
      //return await message.reply(`:x: **Command execution error.**`).catch(() => { });
  }

  try {
      CheckAccess(command.roles, command.users, message.member, message.author);
  } catch (reason) {
      await message.reply(":x: **You don't have permission to use this command.**").catch(() => { });
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
    await message.reply({ content: `:x: **You require the permissions:** \`${permissions}\``, ephemeral: true }).catch(() => { });
    return;
  }

  try {
      CheckPermissions(command.clientPerms, message.guild.members.me);
  } catch (permissions) {
      await message.reply({ content: `:x: **Messager requires the permissions:** \`${permissions}\``,  ephemeral: true }).catch(() => { });
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

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const username = message.author.username;
    const messageContent = message.content;

    let userMessageData = await UserMessageCount.findOneAndUpdate(
        { userId, guildId },
        {
            $inc: { messageCount: 1 },
            $set: {
                username,
                'lastMessage.content': messageContent,
                'lastMessage.timestamp': new Date()
            }
        },
        { upsert: true, new: true }
    );

    if (userMessageData.messageCount % 200 === 0) {
        // Randomly generate points between 50 and 65
        const pointsEarned = Math.floor(Math.random() * (65 - 50 + 1)) + 50;
        
        userMessageData.points += pointsEarned; 
        userMessageData.points += pointsEarned; // Increment points by the randomized value
        await userMessageData.save();

        const embed = new EmbedBuilder()
            .setColor('#f8aa35')
            .setDescription(`You have earned **${pointsEarned}** points for reaching **${userMessageData.messageCount.toLocaleString()}** messages.`)

        await message.channel.send({ content: `<@${userId}>`, embeds: [embed] });

        try {
            const user = await message.author.fetch();
            const dmEmbed = new EmbedBuilder()
                .setColor('#f8aa35')
                .setTitle('**Messager Reminder**')
                .setDescription(`Congratulations, you've earned **${pointsEarned}** points! Use \`/store\` and see what you can buy with your points!`)

            await user.send({ embeds: [dmEmbed] });
        } catch (err) {
            console.error(`Failed to send DM to user ${userId}:`, err);
        }
    }
});

const LogChannel = require('./schemas/logChannel'); // Adjust the path as necessary

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    const logChannelData = await LogChannel.findOne({ guildId: message.guild.id });
    if (!logChannelData) return;

    const { webhookId, webhookToken } = logChannelData;

    try {
      const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

      const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
      const embed = new EmbedBuilder()
        .setColor('#c66dfd')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(message.content)
        .addFields(
          { name: 'Channel', value: message.channel.toString(), inline: true },
          { name: 'Message ID', value: message.id, inline: true },
          { name: 'Time', value: message.createdAt.toISOString(), inline: true }
        )
        .setFooter({ text: `Author ID: ${message.author.id}` })
        .setTimestamp()
        .setURL(messageLink);

      await webhookClient.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error sending log message:', error);
    }
  },
};
