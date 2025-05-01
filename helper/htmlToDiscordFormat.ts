import { JSDOM } from "jsdom";
import config from "./../config.json" with { type: 'json' };

export function htmlToDiscordFormat(html: string) {
    const dom = new JSDOM(`<div>${html}</div>`);
    const element = dom.window.document.querySelector('div');

    if (!element) return { content: '', imageUrls: [] };

    const imageUrls: string[] = [];

    let result = processNode(element, {}, imageUrls);

    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/[ \t]+\n/g, '\n');

    return { content: result, imageUrls };
}

function processNode(node: Element, context: any = {}, imageUrls: string[] = []) : string {
    let result = '';

    for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
            let text = child.textContent || '';
            if (text.trim() || !context.isBlockElement) {
                result += text;
            }
        } else if (child.nodeType === 1) {
            const element = child as Element;
            const tagName = element.tagName.toLowerCase();

            const isBlockElement = isBlock(tagName);
            const childContext = { ...context, isBlockElement };

            const content = processNode(element, childContext, imageUrls);

            switch (tagName) {
                // Headings
                case 'h1':
                    result += `\n\n# **${content.trim()}**\n\n`;
                    break;
                case 'h2':
                    result += `\n\n## **${content.trim()}**\n\n`;
                    break;
                case 'h3':
                    result += `\n\n### **${content.trim()}**\n\n`;
                    break;
                case 'h4':
                case 'h5':
                case 'h6':
                
                // Text Formatting
                case 'b':
                case 'strong':
                    result += `**${content}**`;
                    break;
                case 'i':
                    result += `*${content}*`;
                    break;
                case 'em':
                    result += `*${content}*`;
                    break;
                case 'u':
                    result += `__${content}__`;
                    break;
                case 's':
                case 'strike':
                case 'del':
                    result += `~~${content}~~`;
                    break;
                case 'mark':
                    result += `**${content}**`;
                    break;
                case 'code':
                    result += `\`${content}\``;
                    break;
                case 'pre':
                    result += `\n\`\`\`\n${content}\n\`\`\`\n`;
                    break;

                // Block elements
                case 'p':
                    const align = element.getAttribute('align');
                    if (align === 'center') {
                        result += `\n${content.trim()}\n\n`;
                    } else {
                        result += `\n${content.trim()}\n\n`;
                    }
                    break;
                case 'div':
                case 'section':
                case 'article':
                case 'main':
                case 'header':
                case 'footer':
                    result += `\n${content}\n`;
                    break;
                case 'blockquote':
                    result += `\n> ${content.trim().replace(/\n/g, '\n> ')}\n\n`;
                    break;

                // Lists
                case 'ul':
                    result += `\n${content}\n`;
                    break;
                case 'ol':
                    result += `\n${content}\n`;
                    break;
                case 'li':
                    const parentTag = element.parentElement?.tagName.toLowerCase();
                    if (parentTag === 'ol') {
                        const index = Array.from(element.parentElement?.children || []).indexOf(element) + 1;
                        result += `${index}. ${content.trim()}\n`;
                    } else {
                        result += `- ${content.trim()}\n`;
                    }
                    break;
                case 'dl':
                    result += `\n${content}\n`;
                    break;
                case 'dt':
                    result += `**${content.trim()}**\n`;
                    break;
                case 'dd':
                    result += `${content.trim()}\n\n`;
                    break;

                // Tables
                case 'table':
                    result += `\n${content}\n`;
                    break;
                case 'tr':
                    result += `${content}\n`;
                    break;
                case 'th':
                    result += `**${content.trim()}** | `;
                    break;
                case 'td':
                    result += `${content.trim()} | `;
                    break;
                
                // Links
                case 'a':
                    const href = element.getAttribute('href');
                    if (href) {
                        if (href.startsWith('mailto:')) {
                            result += `\n[${content}](${href})`;
                        } else {
                            const url = href.startsWith('http') ? href : `${config.url}${href}`;
                            result += `[${content}](${url})`;
                        }
                    } else {
                        result += content;
                    }
                    break;

                // Image
                case 'img':
                    const src = element.getAttribute('src');

                    if (src) {
                        const imageUrl = src.startsWith('http') ? src : `${config.url}${src}`;

                        imageUrls.push(imageUrl);
                    }
                    break;
                case 'br':
                    result += '\n';
                    break;
                case 'hr':
                    result += '\n---\n';
                    break;

                // Other elements
                case 'sup':
                    result += `^(${content})`;
                    break;
                case 'sub':
                    result += `_(${content})`;
                    break;
                case 'span':
                    const style = element.getAttribute('style');
                    const fontSize = element.getAttribute('font-size');
                    const fontWeight = element.getAttribute('font-weight');
                    const color = element.getAttribute('color');
                    const textDecoration = element.getAttribute('text-decoration');

                    if (fontWeight === 'bold' || parseInt(fontWeight!) >= 600) {
                        result += `**${content}**`;
                    } else if (fontSize && parseInt(fontSize) > 16) {
                        result += `**${content}**`;
                    } else if (textDecoration?.includes('underline')) {
                        result += `__${content}__`;
                    } else if (textDecoration?.includes('line-through')) {
                        result += `~~${content}~~`;
                    } else if (color && (color.includes('red') || color.includes('#f00'))) {
                        result += `**${content}**`;
                    } else if (color && (color.includes('blue') || color.includes('#00f'))) {
                        result += `__${content}__`;
                    } else {
                        result += content;
                    }
                    break;
                default:
                    result += content;
            }
        }
    }

    return result;
}

function isBlock(tagName: string) {
    const blockElements = [
        'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'table', 'tr', 'blockquote', 'pre',
        'form', 'fieldset', 'dl', 'dt', 'dd', 'section', 'article',
        'header', 'footer', 'nav', 'aside', 'main', 'figure'
    ];

    return blockElements.includes(tagName);
}