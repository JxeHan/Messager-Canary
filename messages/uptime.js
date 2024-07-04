const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'uptime',
  description: 'Show uptime for Messager',

  async execute(interaction, client) {


    const guildsCount = client.guilds.cache.size;
    const apiLatency = Math.round(client.ws.ping);
    const uptime = getUptime(client.uptime);

    const embed = new EmbedBuilder()
      .setColor('f8aa35')
      .setDescription(`${uptime}`)

    await interaction.channel.send({ embeds: [embed] });
  },
};

function getUptime(ms) {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor(((ms % 86400000) % 3600000) / 60000);
  const seconds = Math.floor((((ms % 86400000) % 3600000) % 60000) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
