import { ChatInputCommandInteraction, Client, EmbedBuilder, User } from "discord.js";
import { Command } from "../types/Command";

export default {
    name: 'report',
    type: 3,
    description: 'Report a bug or suggestion or new features',
    options: [
        {
            type: 3,
            name: 'type',
            description: 'Choose between bug or new feature',
            required: true,
            choices: [
                {
                    name: 'Bug',
                    value: 'bug'
                },
                {
                    name: 'New Feature',
                    value: 'new_feature'
                }
            ]
        },
        {
            type: 3,
            name: 'message',
            description: 'Write your message here',
            required: true
        }
    ],
    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        try {
            const type = interaction.options.getString('type');
            const msg = interaction.options.getString('message');
            const user = interaction.user;
            const owner = client.users.cache.get('709210314230726776');

            if (!owner) throw new Error('Owner not found in user cache.');

            const embed = reportMsg(user, type === 'bug'? 'Bug Report' : 'Add New Feature', msg!);
            
            await owner.send({ embeds: [embed] });
            await interaction.reply('Report message sent to the developer.\nYou can also create an issue [here](https://github.com/xenoncolt/aiub-notice-bot/issues/new)');
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while executing this command!');
        }
    }
} as Command;

function reportMsg(user: User, title: string, msg: string) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL()
        })
        .setDescription(msg)
        .setColor('Random')
        .setTimestamp();

    return embed;
}