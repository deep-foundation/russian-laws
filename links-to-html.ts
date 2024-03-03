import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { log } from "./log";

export function linksToHtml({ deep, documentRootId }: { deep: DeepClient; documentRootId: number; }) {
    let htmlContent = "";

    const containTypeLinkId = deep.idLocal('@deep-foundation/core', 'Contain')
    const documentLink = deep.minilinks.byId[documentRootId];
    log({documentLink})
    const containForSectionLinkArray = documentLink.outByType[containTypeLinkId];
    log({containForSectionLinkArray})
    containForSectionLinkArray.forEach(containForSectionLink => {
        const sectionLinkId = containForSectionLink.to.id;
        log({sectionLinkId})
        const sectionTitle = containForSectionLink['string'].value;
        log({sectionTitle})
        htmlContent += `<p class="H">${sectionTitle}</p>\n`;

        const sectionLink = deep.minilinks.byId[sectionLinkId];
        log({sectionLink})
        const containForChapterLinkArray = sectionLink.outByType[containTypeLinkId];
        log({containForChapterLinkArray})
        const chapterIndentAmount = 2;
        containForChapterLinkArray?.forEach(containForChapterLink => {
            const chapterLinkId = containForChapterLink.to.id;
            log({chapterLinkId})
            const chapterTitle = containForChapterLink['string'].value;
            log({chapterTitle})
            htmlContent += ' '.repeat(chapterIndentAmount) + `<p class="H">${chapterTitle}</p>\n`;

            const chapterLink = deep.minilinks.byId[chapterLinkId];
            log({chapterLink})
            const containForArticleLinkArray = chapterLink.outByType[containTypeLinkId];
            log({containForArticleLinkArray})
            const articleIndentAmount = 4;
            containForArticleLinkArray?.forEach(containForArticleLink => {
                const articleLinkId = containForArticleLink.to.id;
                log({articleLinkId})
                const articleTitle = containForArticleLink['string'].value;
                log({articleTitle})
                htmlContent += ' '.repeat(articleIndentAmount) + `<p class="H">${articleTitle}</p>\n`;

                const articleLink = deep.minilinks.byId[articleLinkId];
                log({articleLink})
                const containForClauseLinkArray = articleLink.outByType[containTypeLinkId];
                log({containForClauseLinkArray})
                const clauseIndentAmount = 6;
                containForClauseLinkArray?.forEach(containForClauseLink => {
                    const clauseTitle = containForClauseLink['string'].value;
                    log({clauseTitle})
                    htmlContent += ' '.repeat(clauseIndentAmount) + `<p>${clauseTitle}</p>\n`;
                });
            });
        });
    });

    const result = `<html><body>${htmlContent}</body></html>`;
    log({result})
    return result;
}
