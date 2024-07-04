const { WebhookClient, Client, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const webhook = new WebhookClient({ url: config.WEBHOOKURL });

const eventColors = {
    'SIGINT': 'Orange',
    'uncaughtException': 'Red',
    'SIGTERM': 'Orange',
    'unhandledRejection': 'Red',
    'warning': 'Yellow',
    'uncaughtReferenceError': 'Red'
};

const logErrorToWebhook = async (eventType, error) => {
    const color = eventColors[eventType] || 'Red'; // Default to red if event type is not in the mapping
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Process Event: ${eventType}`)
        .setDescription(`\`\`\`${error.stack || error.message || error}\`\`\``)
        .setTimestamp();

    try {
        await webhook.send({ content: '<@&1257158536501264404>', embeds: [embed] });
        //console.log('Error log sent to webhook.');
    } catch (webhookError) {
        console.error('Error sending log to webhook:', webhookError);
    }
};

module.exports = function () {
    // Ctrl + C
    process.on('SIGINT', () => {
        const message = 'SIGINT: Closing database and exiting...';
        console.log(message);
        logErrorToWebhook('SIGINT', new Error(message));
        process.reallyExit(1);
    });

    // Standard crash
    process.on('uncaughtException', (err) => {
        //console.error(`UNCAUGHT EXCEPTION: ${err.stack}`);
        logErrorToWebhook('uncaughtException', err);
    });

    // Killed process
    process.on('SIGTERM', () => {
        const message = 'SIGTERM: Closing database and exiting...';
        //console.error(message);
        logErrorToWebhook('SIGTERM', new Error(message));
        process.reallyExit(1);
    });

    // Standard crash
    process.on('unhandledRejection', (err) => {
        //console.error(`UNHANDLED REJECTION: ${err.stack}`);
        logErrorToWebhook('unhandledRejection', err);
    });

    // Deprecation warnings
    process.on('warning', (warning) => {
        //console.warn(`WARNING: ${warning.name} : ${warning.message}`);
        //logErrorToWebhook('warning', warning);
    });

    // Reference errors
    process.on('uncaughtReferenceError', (err) => {
        //console.error(err.stack);
        logErrorToWebhook('uncaughtReferenceError', err);
    });
};
