const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Send a report to the developers')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of your report')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('The detailed description of your report')
                .setRequired(true)),
    async execute(interaction) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const username = interaction.user.username;
        const userId = interaction.user.id;

        const webhook = new WebhookClient({ url: 'https://discord.com/api/webhooks/1257868396213833858/cYxu4C9Oimk7YJto_8mFf1stXRp0rdRn3jbuLjIvVzNwoW6_1tnwNOrodi1wTkGoiQRN' });

        const embed = new EmbedBuilder()
            .setTitle(`**${title}**`)
            .setDescription(description)
            .setColor('Red')
            .setFooter({ text: 'Reported' })
            .setTimestamp();

        await webhook.send({
            content: `<@${userId}>`,
            embeds: [embed.toJSON()]
        });

        await interaction.reply({ content: 'Thank you for your report! The developers have been notified.', ephemeral: true });
    },
};
