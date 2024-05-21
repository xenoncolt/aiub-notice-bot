import { EmbedBuilder } from 'discord.js';

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
    async execute(interaction, client) {
        try {
            const type = interaction.options.getString('type');
            const msg = interaction.options.getString('message');
            const user = interaction.user;
            const owner = await client.users.cache.get('709210314230726776');

            if (type === 'bug') {
                const embed = reportMsg(user, 'Bug Report', msg);

                await owner.send({ embeds: [embed] });
                await interaction.reply('Report message send to the developer.\nYou can also create issue [here](https://github.com/xenoncolt/aiub-notice-bot/issues/new)');
            } else if (type === 'new_feature') {
                const embed = reportMsg(user, 'Add New Feature', msg);

                await owner.send({ embeds: [embed] });
                await interaction.reply('Report message send to the developer.\nYou can also create issue [here](https://github.com/xenoncolt/aiub-notice-bot/issues/new)');
            } 
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while executing this command!');
        }
    }
}

function reportMsg(user, title, msg) {
    const random_color = Math.floor(Math.random() * 16777215);

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setDescription(msg)
        .setColor(random_color)
        .setTimestamp();

    return embed;
}