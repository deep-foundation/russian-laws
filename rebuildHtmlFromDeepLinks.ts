import { containTypeLinkId } from "./html-to-json.js";

export function rebuildHtmlFromDeepLinks({ deep, rootId }: { deep; rootId; }) {
    let htmlContent = "";

    const sectionLinks = deep.minilinks.byId[rootId].outByType[containTypeLinkId];
    sectionLinks.forEach(sectionLink => {
        const sectionId = sectionLink.to.id;
        const sectionTitle = sectionLink.string.value;
        htmlContent += `<p class="H">${sectionTitle}</p>\n`;

        const articleLinks = deep.minilinks.byId[sectionId].outByType[containTypeLinkId];
        articleLinks?.forEach(articleLink => {
            const articleId = articleLink.to.id;
            const articleTitle = articleLink.string.value;
            htmlContent += `  <p class="H">${articleTitle}</p>\n`;

            const clauseLinks = deep.minilinks.byId[articleId].outByType[containTypeLinkId];
            clauseLinks?.forEach(clauseLink => {
                const clauseTitle = clauseLink.string.value;
                htmlContent += `  <p>${clauseTitle}</p>\n`;
            });
        });
    });

    return `<html><body>${htmlContent}</body></html>`;
}
