export interface Notice {
    title: string;
    desc: string;
    full_desc: string;
    link_info: string;
    img_urls: string[];
    day: string;
    month: string;
    year: string;
    pdf_options: {
        label: string;
        description: string;
        value: string;
    }[];
}