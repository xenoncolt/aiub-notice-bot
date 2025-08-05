import axios from "axios";
import { ActionRowBuilder, AttachmentBuilder, AutocompleteInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import config from "../config.json" with { type: "json" };
import { FacultyProfile, tempFP } from "../types/FacultyProfile.js";
import { Command } from "../types/Command";
import { downloadImage } from "../helper/downloadImage.js";


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

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const email = interaction.options.getString('email');
            const name = interaction.options.getString('name');

            if (!email && !name) {
                return interaction.reply({ content: 'Please provide either a email or name to search.', ephemeral: true });
            }

            const response = await axios.get(config.faculty_list);
            const profile_list: FacultyProfile[] = response.data.EmployeeProfileLightList;
            // const profile = profile_list.find(profile => profile.CvPersonal.Email === email);

            let profile: FacultyProfile | undefined;

            if (name) {
                profile = profile_list.find(profile => profile.CvPersonal.Name && profile.CvPersonal.Name.toUpperCase() === name.toUpperCase());
                // console.log(profile);
            }

            if (!profile && email) {
                profile = profile_list.find(profile => profile.CvPersonal.Email && profile.CvPersonal.Email.toLowerCase() === email.toLowerCase());
                // console.log(profile);
            }
            
            // temp fix
            const res = await axios.get(config.temp_f_de);
            // console.log(res.data);
            if (res.status === 200) {
                // console.log("OK");
                const temp_pfp_list: tempFP[] = res.data;
                const temp_pfp = temp_pfp_list.find(p => p.Email === profile!.CvPersonal.Email);
                if (temp_pfp?.["Room No"]) {
                    const room_no = temp_pfp["Room No"];
                    profile!.PersonalOtherInfo.RoomNo = room_no || profile?.PersonalOtherInfo.RoomNo;
                    const first_char = room_no.charAt(0);
                    profile!.PersonalOtherInfo.BuildingNo = first_char === 'D' ? 'D - Building' :
                        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(first_char) ? `ANNEX - ${first_char}` :
                        'Unknown Building';
                }
            }

            if (profile) {
                const { embed, attachment } = await getFacultyDetails(profile);
                const link_btn = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Details')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://www.aiub.edu/faculty-list/faculty-profile#' + profile.CvPersonal.Email)
                    );
                await interaction.reply({ embeds: [embed!], components: [link_btn], files: [attachment] });
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
            const focused_value = focused_option.value.trim().toUpperCase();
            filtered_profiles = profile_list.filter(profile => {
                const name = profile.CvPersonal.Name;
                return name && name.trim().toUpperCase().includes(focused_value);
            });
        }

        if (focused_option.name === 'email') {
            const focused_value = focused_option.value.trim().toLowerCase();
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

async function getFacultyDetails(profile: FacultyProfile): Promise<{ embed: EmbedBuilder, attachment: AttachmentBuilder }> {
    const image_path = await downloadImage(config.url + profile.PersonalOtherInfo.SecondProfilePhoto) as string;
    // const channel = client.channels.cache.get('1244675616306102402') as TextChannel;
    const att_name = profile.CvPersonal.Name.replace(/\s+/g, '-').toLowerCase();
    const attachment = new AttachmentBuilder(image_path, { name: `${att_name}.png` });

    // const sent_msg = await channel.send({ files: [attachment] });
    // const attachment_url = sent_msg.attachments.first()?.url;

    const embed = new EmbedBuilder()
        .setTitle(profile.CvPersonal.Name)
        .setColor('Random')
        .setThumbnail(`attachment://${att_name}.png`)
        .addFields(
            { name: 'Faculty:', value: profile.Faculty || 'Unavailable', inline: true },
            { name: 'Designation:', value: profile.Designation || 'Unavailable', inline: false },
            { name: 'Department:', value: profile.HrDepartment || 'Unavailable', inline: false },
            { name: 'Position:', value: profile.Position || 'Unavailable', inline: false },
            { name: 'Building:', value: profile.PersonalOtherInfo.BuildingNo || 'Unavailable, Check D-Building Notice Board', inline: true },
            { name: 'Room No:', value: profile.PersonalOtherInfo.RoomNo || 'Unavailable, Check D-Building Notice Board', inline: true }
        )
        .setFooter({ text: "Sometimes the data may not be accurate or up to date due to the nature of the source." });

    return { embed, attachment };
}