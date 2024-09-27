import axios from "axios";
import { ActionRowBuilder, AttachmentBuilder, AutocompleteInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, EmbedBuilder, TextChannel } from "discord.js";
import config from "../config.json" assert { type: "json" };
import { FacultyProfile } from "../types/FacultyProfile.js";
import path, { resolve } from "path";
import { createWriteStream, mkdirSync } from "fs";
import { Command } from "../types/Command";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'faculty-details',
    type: 3,
    description: 'Get your faculty or Teacher\'s details using either Email or Name',
    options: [
        {
            type: 3,
            name: 'name',
            description: 'Write your faculty name (ex. Shahriar Haque)',
            required: false,
            autocomplete: true
        },
        {
            type: 3,
            name: 'email',
            description: 'Write your faculty email (ex. fac@aiub.edu)',
            required: false,
            autocomplete: true
        }
    ],

    async execute (interaction: ChatInputCommandInteraction, client: Client) {
        try {
            const email = interaction.options.getString('email');
            const name = interaction.options.getString('name');

            if (!email && !name) {
                return interaction.reply({content: 'Please provide either a email or name to search.', ephemeral: true});
            }

            const response = await axios.get(config.faculty_list);
            const profile_list: FacultyProfile[] = response.data.EmployeeProfileLightList;
            // const profile = profile_list.find(profile => profile.CvPersonal.Email === email);

            let profile: FacultyProfile | undefined;

            if (name) {
                profile = profile_list.find(profile => profile.CvPersonal.Name.toUpperCase() === name.toUpperCase());
            }

            if (!profile && email) {
                profile = profile_list.find(profile => profile.CvPersonal.Email.toLowerCase() === email.toLowerCase());
            }

            if (profile) {
                const embed = await getFacultyDetails(profile, client);
                const link_btn = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Details')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://www.aiub.edu/faculty-list/faculty-profile#'+email)
                    );
                await interaction.reply({ embeds: [embed!], components: [link_btn]});
            } else {
                await interaction.reply('Faculty or Teacher you are looking for is not found.\nPlease make sure your **Name** or **Email** is correct. It will also suggest some name where you can select one. You can use either **Name** or **Email** to search.');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while executing this command!');
        }
    },

    async autocomplete(interaction: AutocompleteInteraction) {
        const focused_option = interaction.options.getFocused(true);
        const response = await axios.get(config.faculty_list);
        const profile_list: FacultyProfile[] = response.data.EmployeeProfileLightList;

        let filtered_profiles: FacultyProfile[] = [];

        if (focused_option.name === 'name') {
            const focused_value = focused_option.value.toUpperCase();
            filtered_profiles = profile_list.filter(profile => profile.CvPersonal.Name.toUpperCase().includes(focused_value));
        }

        if (focused_option.name === 'email') {
            const focused_value = focused_option.value.toLowerCase();
            filtered_profiles = profile_list.filter(profile => {
                const email = profile.CvPersonal.Email; 
                return email && email.startsWith(focused_value);
            });
        }

        await interaction.respond(
            filtered_profiles.slice(0, 25).map(profile => ({
                name: focused_option.name === 'name' ? profile.CvPersonal.Name : profile.CvPersonal.Email,
                value: focused_option.name === 'name' ? profile.CvPersonal.Name : profile.CvPersonal.Email
            }))      
        );
    }
} as Command;

async function getFacultyDetails(profile: FacultyProfile, client: Client) {
    const image_path = await downloadImage(config.url+profile.PersonalOtherInfo.SecondProfilePhoto);
    const channel = client.channels.cache.get('1244675616306102402') as TextChannel;
    const attachment = new AttachmentBuilder(image_path);

    const sent_msg = await channel.send({ files: [attachment] });
    const attachment_url = sent_msg.attachments.first()?.url;

    try {
        const embed = new EmbedBuilder()
            .setTitle(profile.CvPersonal.Name)
            .setColor('Random')
            .setThumbnail(attachment_url!)
            .addFields(
                { name: 'Faculty:', value: profile.Faculty || 'Unavailable', inline: true },
                { name: 'Designation:', value: profile.Designation || 'Unavailable', inline: false },
                { name: 'Department:', value: profile.HrDepartment || 'Unavailable', inline: false },
                { name: 'Position:', value: profile.Position || 'Unavailable', inline: false },
                { name: 'Building:', value: profile.PersonalOtherInfo.BuildingNo || 'Unavailable, Check D-Building Notice Board', inline: true },
                { name: 'Room No:', value: profile.PersonalOtherInfo.RoomNo || 'Unavailable, Check D-Building Notice Board', inline: true }
            );

        return embed;
    } catch (error) {
        console.error(error);
    }
}

async function downloadImage(url: string): Promise<string> {
    const dir = path.join(__dirname, '../download');

    mkdirSync(dir, { recursive: true });

    const image_path = path.join(dir, 'temp.jpg');
    const writer = createWriteStream(image_path);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(image_path));
        writer.on('error', reject);
    });
}