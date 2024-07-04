const { SlashCommandBuilder, WebhookClient } = require('discord.js');

module.exports = {
    clientPerms: ['ManageWebhooks'],
    cooldown: 8,
    data: new SlashCommandBuilder()
        .setName('text')
        .setDescription('Format text in different styles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('bold')
                .setDescription('Format text in bold')
                .addStringOption(option =>
                    option.setName('input')
                        .setDescription('The text to format')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('code')
                .setDescription('Format text in a code block')
                .addStringOption(option =>
                    option.setName('input')
                        .setDescription('The text to format')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('italic')
                .setDescription('Format text in italic')
                .addStringOption(option =>
                    option.setName('input')
                        .setDescription('The text to format')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('quote')
                .setDescription('Format text as a block quote')
                .addStringOption(option =>
                    option.setName('input')
                        .setDescription('The text to format')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('spoiler')
                .setDescription('Format text as a spoiler')
                .addStringOption(option =>
                    option.setName('input')
                        .setDescription('The text to format')
                        .setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const input = interaction.options.getString('input');

        let formattedText;
        switch (subcommand) {
            case 'bold':
                formattedText = `**${input}**`;
                break;
            case 'code':
                formattedText = `\`\`\`${input}\`\`\``;
                break;
            case 'italic':
                formattedText = `*${input}*`;
                break;
            case 'quote':
                formattedText = `> ${input}`;
                break;
            case 'spoiler':
                formattedText = `||${input}||`;
                break;
            default:
                formattedText = input;
        }

        const webhook = await interaction.channel.createWebhook({
            name: interaction.user.username,
            avatar: interaction.user.displayAvatarURL({ dynamic: true })
        });

        await webhook.send({
            content: formattedText,
            username: interaction.user.username,
            avatarURL: interaction.user.displayAvatarURL({ dynamic: true })
        });

        await webhook.delete();

        await interaction.reply({ content: `Your message has sent.`, ephemeral: true });
    },
};
