const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserMessageCount = require('../../schemas/userMessageCount'); // Adjust the path as necessary

async function getTotalMessages() {
    const result = await UserMessageCount.aggregate([
        { $group: { _id: null, totalMessages: { $sum: "$messageCount" } } }
    ]);
    return result.length > 0 ? result[0].totalMessages : 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Showcase available commands & info'),

    async execute(interaction, client) {
        const totalMessages = await getTotalMessages();

        let totalGuilds = client.guilds.cache.size;
        let totalUsers = 0;

        client.guilds.cache.forEach(guild => {
            totalUsers += guild.memberCount;
        });

        // Create the embed for the help command
        const embed = new EmbedBuilder()
            .setColor('#f8aa35')
            .setTitle('**Help**')
            .setDescription('[Support](https://discord.gg/MDfdaA7z) • [Top.gg](https://top.gg/bot/1256755642555826317) • [Bots.gg](https://discord.bots.gg/bots/1256755642555826317)')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '**/profle**', value: 'Showcase member profile', inline: true },
                { name: '**/export**', value: 'Export messages from a channel', inline: true },
                { name: '**/points**', value: 'Check your accumulated points', inline: true },
                { name: '**/messages**', value: 'Showcase your own messages', inline: true },
                { name: '**/store**', value: 'View items available for purchase', inline: true },
                { name: '**/text**', value: 'Format text in different styles', inline: true },
                { name: '**/report**', value: 'Send a report to the developers', inline: true },
                { name: '**/status**', value: 'Check the status of Messager systems', inline: true },
                { name: '**/leaderboard**', value: 'View leaderboards for messages, mentions, and points', inline: true }

            )
            .setFooter({ text: `Servers: ${totalGuilds} • Users: ${totalUsers} • Messages: ${totalMessages.toLocaleString()}`, iconURL: client.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};
