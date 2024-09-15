import { EmbedBuilder, Events, Guild } from "discord.js";

export default {
    name: Events.GuildDelete,
    once: false,
    async execute(guild: Guild) {
        const user = await guild.client.users.fetch("709210314230726776");

        if (!user) return;

        const embed = new EmbedBuilder()
            .setTitle("Left a Server")
            .setDescription(`Guild Name: **${guild.name}**`)
            .setThumbnail(guild.iconURL())
            .setImage(guild.bannerURL())
            .setColor('Red')
            .addFields(
                {
                    name: "Guild Description",
                    value: guild.description || "No Description",
                    inline: false
                },
                {
                    name: "Guild Owner",
                    value: `<@${guild.ownerId}>`,
                    inline: true
                },
                {
                    name: "Guild Total Members",
                    value: guild.memberCount.toString(),
                    inline: false
                },
                {
                    name: "Guild Created",
                    value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>`,
                    inline: false
                },
                {
                    name: "Guild Verification",
                    value: guild.verified ? "✅" : "❌",
                    inline: false
                }
            )
            .setTimestamp();

        user.send({ embeds: [embed] });
    }
}