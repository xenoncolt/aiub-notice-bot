import axios from "axios";
import { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import config from "../config.json" assert { type: "json" };
import path from 'path';
import { createWriteStream, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

export default {
    name: 'faculty-details',
    type: 3,
    description: 'Get your faculty or Teacher\'s details using email',
    options: [
        {
            type: 3,
            name: 'email',
            description: 'Enter your faculty email',
            required: true
        }//,
        // {
        //     name: '@aiub.edu'
        // }
    ],

    async execute(interaction, client) {
        try {
            const email = interaction.options.getString('email');

            const response = await axios.get(config.faculty_list);
            const profile_list = response.data.EmployeeProfileLightList;
            const profile = profile_list.find(profile => profile.CvPersonal.Email === email);

            if (profile) {
                const embed = await getFacultyDetails(profile, client);
                const link_btn = new ActionRowBuilder()
                    .addComponents(
                         new ButtonBuilder()
                            .setLabel('Details')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://www.aiub.edu/faculty-list/faculty-profile#'+email)
                    );
                await interaction.reply( { embeds: [embed], components: [link_btn] } );
            } else {
                await interaction.reply('Faculty or Teacher you are looking for is not found.\nPlease make sure your email is correct. Do not include any space.\nExample: \`/faculty-room this_part\`');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while executing this command!');
        }
    }
}

async function getFacultyDetails(profile, client) {
    // const response = await axios.get(config.faculty_url+email);
    // const dom = new JSDOM(response.data);
    // const document = dom.window.document;

    // const full_name = document.querySelector('.faculty-title').textContent.trim();
    // const room_no = document.querySelector("[x-text='profileData.PersonalOtherInfo.RoomNo']").textContent.trim();
    // const building = document.querySelector("[x-text='profileData.PersonalOtherInfo.BuildingNo']").textContent.trim();
    // const pic_url = document.querySelector('.pro-pic').src;
    // const department = document.querySelector("[x-text='profileData.HrDepartment']").textContent.trim();
    // const faculty = document.querySelector("[x-text='profileData.Faculty']").textContent.trim();
    // const position = document.querySelector("[x-text='profileData.Position']").textContent.trim();

    const full_name = profile.CvPersonal.Name;
    const room_no = profile.PersonalOtherInfo.RoomNo || 'N/A';
    const building = profile.PersonalOtherInfo.BuildingNo || 'N/A';
    const pic_url = config.url+profile.PersonalOtherInfo.SecondProfilePhoto;
    const department = profile.HrDepartment || 'N/A';
    const faculty = profile.Faculty || 'N/A';
    const position = profile.Position || 'N/A';
    const working_as = profile.Designation || 'N/A';

    const image_path = await downloadImage(pic_url);
    const channel = client.channels.cache.get('1244675616306102402');
    const attachment = new AttachmentBuilder(image_path);
    const sent_message = await channel.send({ files: [attachment] });
    const attachment_url = sent_message.attachments.first().url;

    const random_color = Math.floor(Math.random() * 16777215);
    try{
    const embed = new EmbedBuilder()
        .setTitle(full_name)
        .setColor(random_color)
        .setThumbnail(attachment_url)
        .addFields(
            { name: 'Faculty:', value: faculty, inline: true},
            { name: 'Designation:', value: working_as, inline: false },
            { name: 'Department:', value: department, inline: false },
            { name: 'Position:', value: position, inline: false },
            { name: 'Building:', value: building, inline: true },
            { name: 'Room No:', value: room_no, inline: true }
        );

        return embed;
    } catch (e) {
        console.error(e);
    }
}

async function downloadImage(url) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
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