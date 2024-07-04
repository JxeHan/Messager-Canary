const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function sendPagination(interaction, pages) {
    let currentPage = 0;
    const maxPages = pages.length;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setEmoji('1250031431321653318')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('middle')
                .setLabel(`${currentPage + 1}/${maxPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next')
                .setEmoji('1250031432605237290')
                .setStyle(ButtonStyle.Secondary),
        );

    const message = await interaction.reply({ embeds: [pages[currentPage]], components: [row] });

    const filter = (i) => i.customId === 'prev' || i.customId === 'next';
    const collector = message.createMessageComponentCollector({ filter });

    collector.on('collect', async (i) => {
        // Check if the user who clicked the button is the same as the user who issued the command
        if (i.user.id !== interaction.user.id) {
            await i.reply({ content: 'You can\'t interact with these view.', ephemeral: true });
            return;
        }

        if (i.customId === 'prev') {
            currentPage -= 1;
        } else if (i.customId === 'next') {
            currentPage += 1;
        }

        if (currentPage < 0) {
            currentPage = maxPages - 1;
        } else if (currentPage >= maxPages) {
            currentPage = 0;
        }

        // Update the middle button with the current page / total pages
        row.components[1].setLabel(`${currentPage + 1}/${maxPages}`);

        await i.update({ embeds: [pages[currentPage]], components: [row] });
    });

    collector.on('end', () => {
        message.edit({ components: [] });
    });
}

module.exports = { sendPagination };
