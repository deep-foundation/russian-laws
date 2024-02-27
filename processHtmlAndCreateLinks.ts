import { SerialOperation } from "@deep-foundation/deeplinks/imports/client.js";
import { makeDeepClient, htmlToJson, createLinkOperation, createClauseOperation } from "./html-to-json.js";


async function processHtmlAndCreateLinks(html) {
    let deep = makeDeepClient();
    const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain');
    const commentTypeLinkId = await deep.id('@senchapencha/law', 'Comment');
    const articleTypeLinkId = await deep.id('@senchapencha/law', 'Article');
    const sectionTypeLinkId = await deep.id('@senchapencha/law', 'Section');
    const chapterTypeLinkId = await deep.id('@senchapencha/law', 'Chapter');
    const clauseTypeLinkId = await deep.id('@senchapencha/law', 'Clause');

    console.log('containTypeLinkId', containTypeLinkId);
    console.log('commentTypeLinkId', commentTypeLinkId);
    console.log('articleTypeLinkId', articleTypeLinkId);
    console.log('sectionTypeLinkId', sectionTypeLinkId);
    console.log('chapterTypeLinkId', chapterTypeLinkId);
    console.log('clauseTypeLinkId', clauseTypeLinkId);

    const json = htmlToJson(html);

    let count = 0;
    json.sections.forEach(section => {
        count++; // для каждого раздела
        section.chapters.forEach(chapter => {
            count++; // для каждой главы
            chapter.articles.forEach(() => {
                count++; // для каждой статьи
            });
        });
    });

    const reservedIds = await deep.reserve(count);

    let operations: Array<SerialOperation> = [];
    const processComments = (comments, parentLinkId) => {
        comments?.forEach(comment => {
            operations.push({
                table: 'links',
                type: 'insert',
                objects: {
                    type_id: commentTypeLinkId,
                    in: {
                        data: parentLinkId ? [{
                            type_id: containTypeLinkId,
                            from_id: parentLinkId,
                            string: { data: { value: comment.text } },
                        }] : [],
                    },
                },
            });
        });
    };

    json.sections.forEach(section => {
        const sectionLinkId = reservedIds.pop();
        if (!sectionLinkId) {
            throw new Error('No reserved id');
        }
        operations.push(createLinkOperation(sectionLinkId, sectionTypeLinkId, containTypeLinkId, section.title, deep));
        processComments(section.comments, sectionLinkId);

        section.chapters.forEach(chapter => {
            const chapterLinkId = reservedIds.pop();
            if (!chapterLinkId) {
                throw new Error('No reserved id');
            }
            operations.push(createLinkOperation(chapterLinkId, chapterTypeLinkId, containTypeLinkId, chapter.title, deep, sectionLinkId));
            processComments(chapter.comments, chapterLinkId);

            chapter.articles.forEach(article => {
                const articleLinkId = reservedIds.pop();
                if (!articleLinkId) {
                    throw new Error('No reserved id');
                }
                operations.push(createLinkOperation(articleLinkId, articleTypeLinkId, containTypeLinkId, article.title, deep, chapterLinkId));
                processComments(article.comments, articleLinkId);

                article.clauses.forEach(clause => {
                    operations.push(createClauseOperation(clause, articleLinkId, clauseTypeLinkId, containTypeLinkId));
                });
            });
        });
    });

    const result = await deep.serial({ operations });
    return result;
}