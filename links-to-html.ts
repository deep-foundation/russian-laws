import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { log } from "./log";

export async function linksToHtml({ deep, documentRootId }: { deep: DeepClient; documentRootId: number; }) {
    let htmlContent = "";

    const containTypeLinkId = deep.idLocal('@deep-foundation/core', 'Contain')
    const indexTypeLinkId = await deep.id('@deep-foundation/law', 'Index')
    const documentLink = deep.minilinks.byId[documentRootId];
    log({documentLink})
    const sectionLinks = documentLink.outByType[indexTypeLinkId].map(link => link.to);
    log({sections: sectionLinks})
    sectionLinks.forEach(sectionLink => {
        const sectionTitle = sectionLink['string'].value;
        log({sectionTitle})
        htmlContent += `<p class="H">${sectionTitle}</p>\n`;

        const chapterOrCommentLink = sectionLink.outByType[indexTypeLinkId];
        log({chapterOrCommentLink})
        const sectionChildrenIndentAmount = 2;
        chapterOrCommentLink?.forEach(chapterOrCommentLink => {
            const chapterOrCommentTitle = chapterOrCommentLink['string'].value;
            log({chapterOrCommentTitle})
            htmlContent += ' '.repeat(sectionChildrenIndentAmount) + `<p class="H">${chapterOrCommentTitle}</p>\n`;

            const articleOrCommentLinks = chapterOrCommentLink.outByType[indexTypeLinkId];
            const chapterChildrenIndentAmount = 4;
            articleOrCommentLinks?.forEach(articleOrCommentLink => {
                const articleOrCommentTitle = articleOrCommentLink['string'].value;
                log({articleOrCommentLink})
                htmlContent += ' '.repeat(chapterChildrenIndentAmount) + `<p class="H">${articleOrCommentTitle}</p>\n`;

                const clauseOrCommentLinks = articleOrCommentLink.outByType[indexTypeLinkId];
                const articleChildrenIndentAmount = 6;
                clauseOrCommentLinks?.forEach(clauseOrCommentLink => {
                    const clauseOrCommentTitle = clauseOrCommentLink['string'].value;
                    log({clauseOrCommentTitle})
                    htmlContent += ' '.repeat(articleChildrenIndentAmount) + `<p>${clauseOrCommentTitle}</p>\n`;
                });
            });
        });
    });

    const result = `<html><body>${htmlContent}</body></html>`;
    log({result})
    return result;
}
