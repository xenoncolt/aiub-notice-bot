import { ButtonBuilder, ComponentBuilder, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";

export function noticeComponentV2(title: string, desc: string, full_desc: string | undefined, img_urls: string[], date: string): ContainerBuilder {
    const container = new ContainerBuilder();

    const title_text = `# ${title}\nPublished Date: ${date}`;
    const footer_text = `-# Note from Bot: Please check our [Terms of Service](https://xenoncolt.github.io/file_storage/TERMS_OF_SERVICE) & [policy](https://xenoncolt.github.io/file_storage/PRIVACY_POLICY).\n-# Always verify information from official [sources](https://www.aiub.edu/category/notices)\n-# Remember, this bot is not a replacement for official announcements.\n-# If you face any issues, or notice is not correct, use this command to report: \`/report\``;

    const available_space = 4000 - (title_text.length + 30);

    let full_desc_text = desc;
    if (full_desc) {
        full_desc_text = full_desc!.length > available_space ? full_desc!.slice(0, available_space) + '... Click details to see more' : full_desc;
    }

    const title_section_text = new TextDisplayBuilder().setContent(title_text);
    container.addTextDisplayComponents(title_section_text);

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    );
    // const desc_section = new SectionBuilder();
    // if (full_desc) {
    //     if (full_desc!.length < 4096) {
    //         desc_section.addTextDisplayComponents(
    //             new TextDisplayBuilder().setContent(
    //                 full_desc
    //             )
    //         )
    //     } else {
    //     }
    // }
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            full_desc_text
        )
    );


    if (img_urls.length > 0) {
        let media_builder = new MediaGalleryBuilder();
        for (const img_url of img_urls) {
            media_builder.addItems(
                new MediaGalleryItemBuilder().setURL(img_url)
            );
        }
        container.addMediaGalleryComponents(media_builder);
    }

    if (full_desc && full_desc.length < available_space) {
        container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

        container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(footer_text)
    );
    }

    return container;
}