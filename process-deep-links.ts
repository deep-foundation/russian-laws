import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { log } from "./log.js";

function processDeepLinks({ deep, rootId }: { deep: DeepClient; rootId: number; }) {
    const containTypeLinkId = deep.idLocal('@deep-foundation/core', 'Contain')
    // Получаем все связи типа 'Contain' для корневого узла
    const sectionLinks = deep.minilinks.byId[rootId].outByType[containTypeLinkId];

    sectionLinks.forEach(sectionLink => {
        const sectionId = sectionLink.to.id;
        const sectionTitle = sectionLink['string'].value;
        log(`Section ID: ${sectionId}`);
        log(`Section Title: ${sectionTitle}`);

        // Получаем все связи типа 'Contain' для каждого раздела
        const articleLinks = deep.minilinks.byId[sectionId].outByType[containTypeLinkId];
        if (articleLinks !== undefined) {
            articleLinks.forEach(articleLink => {
                const articleId = articleLink.to.id;
                const articleTitle = articleLink['string'].value;
                log(`  Article ID: ${articleId}`);
                log(`  Article Title: ${articleTitle}`);
                const clauseLinks = deep.minilinks.byId[articleId].outByType[containTypeLinkId];
                if (clauseLinks !== undefined) {
                    clauseLinks.forEach(clauseLink => {
                        const clauseId = clauseLink.id;
                        const clauseTitle = clauseLink['string'].value;
                        log(`    Clause ID: ${clauseId}`);
                        log(`    Clause Title: ${clauseTitle}`);
                    });
                }
            });
        }

    });
}
