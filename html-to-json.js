import { JSDOM } from "jsdom";
import { saveFile } from './files.js';
import { program } from 'commander';
import path from 'path';
import { generateApolloClient } from "@deep-foundation/hasura/client.js";
import { DeepClient, parseJwt } from "@deep-foundation/deeplinks/imports/client.js";
import fs from "fs";

program
    .option('--source-directory <type>', 'Source directory', './data/html')
    .option('--target-directory <type>', 'Target directory', './data/json')
    .option('--source-file-name <type>', 'Source file name (required)')
    .option('--target-file-name <type>', 'Target file name')
    .option('--source-file-extension <type>', 'Source file extension', '.html')
    .option('--target-file-extension <type>', 'Target file extension', '.json')
    .parse(process.argv);

const options = program.opts();
if (!options.sourceFileName) {
    console.log('--source-file-name is required');
    process.exit(1);
}
const sourceFileName = options.sourceFileName + options.sourceFileExtension;
const sourceDirectory = options.sourceDirectory;
const targetFileName = (options.targetFileName ? options.targetFileName : options.sourceFileName) + options.targetFileExtension;
const targetDirectory = options.targetDirectory;

// Преобразование HTML к JSON

const makeDeepClient = () => {
    let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzgwIn0sImlhdCI6MTcwMjkzMzQ5NX0.Ishb_Z94vvgjlvzC9xMvYfyDEJSU13BikjL1n9F_hLk"
    let GQL_URN = "3006-deepfoundation-dev-a1imnyn6psf.ws-eu107.gitpod.io/gql"
    let GQL_SSL = "1"
    if (!token) throw new Error('No token provided');
    const decoded = parseJwt(token);
    const linkId = decoded?.userId;
    const apolloClient = generateApolloClient({
        path: GQL_URN,
        ssl: !!+GQL_SSL,
        token,
    });

    const deepClient = new DeepClient({ apolloClient, linkId, token });
    return deepClient;
}

function htmlToJson(html) {
    const result = { preamble: [], sections: [] };
    const dom = new JSDOM(html);
    const paragraphs = [...dom.window.document.querySelectorAll("p")];

    let currentSection = null;
    let currentChapter = null;
    let currentArticle = null;
    let preambleMode = true;

    for (const p of paragraphs) {
        let text = p.textContent.trim();
        const htmlContent = p.innerHTML.trim();
        if (htmlContent === '&nbsp;' || !text) {
            continue;
        }

        if (preambleMode && !p.classList.contains("H") && !p.classList.contains("T")) {
            result.preamble.push(htmlContent);
            continue;
        }
        if (p.classList.contains("H") || p.classList.contains("T") || p.classList.contains("I")) {
            preambleMode = false;
            let paragraphType;
            if (text.startsWith("РАЗДЕЛ") || text.startsWith("Раздел")) paragraphType = "section";
            if (text.startsWith("ГЛАВА") || text.startsWith("Глава")) paragraphType = "chapter";
            if (text.startsWith("Статья")) paragraphType = "article";
            if (text.startsWith("(") || p.classList.contains("I")) paragraphType = "comment";

            switch (paragraphType) {
                case "section":
                    currentSection = { title: htmlContent, chapters: [] };
                    result.sections.push(currentSection);
                    currentChapter = null;
                    currentArticle = null;
                    break;
                case "chapter":
                    currentChapter = { title: htmlContent, articles: [] };
                    if (currentSection) {
                        currentSection.chapters.push(currentChapter);
                    } else {
                        currentSection = { title: "", chapters: [currentChapter] };
                        result.sections.push(currentSection);
                    }
                    currentArticle = null;
                    break;
                case "article":
                    currentArticle = { title: htmlContent, clauses: [], comments: [] };
                    if (currentChapter) {
                        currentChapter.articles.push(currentArticle);
                    } else {
                        currentChapter = { title: "", articles: [currentArticle] };
                        if (currentSection) {
                            currentSection.chapters.push(currentChapter);
                        } else {
                            currentSection = { title: "", chapters: [currentChapter] };
                            result.sections.push(currentSection);
                        }
                    }
                    break;
                case "comment":
                    const comment = { text: htmlContent };
                    if (currentArticle) {
                        currentArticle.comments.push(comment);
                    } else if (currentChapter) {
                        currentChapter.comments = currentChapter.comments || [];
                        currentChapter.comments.push(comment);
                    } else if (currentSection) {
                        currentSection.comments = currentSection.comments || [];
                        currentSection.comments.push(comment);
                    } else {
                        result.preambleComments = result.preambleComments || [];
                        result.preambleComments.push(comment);
                    }
                    break;
                default:
                    break;
            }
        } else if (currentArticle) {
            currentArticle.clauses.push(htmlContent);
        } else if (currentChapter) {
            currentChapter.articles.push({ title: "", clauses: [htmlContent] });
        } else if (currentSection) {
            currentSection.chapters.push({ title: "", articles: [{ title: "", clauses: [htmlContent] }] });
        } else {
            result.preamble.push(htmlContent);
        }
    }

    return result;
}


function createClauseOperation(clause, articleLinkId, clauseTypeLinkId, containTypeLinkId) {
    return {
        table: 'links',
        type: 'insert',
        objects: {
            type_id: clauseTypeLinkId,
            in: {
                data: articleLinkId ? [{
                    type_id: containTypeLinkId,
                    from_id: articleLinkId,
                    string: { data: { value: clause } },
                }] : [],
            },
        },
    };
}

async function processHtmlAndCreateLinks(json) {
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

    let operations = [];
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
        operations.push(createLinkOperation(sectionLinkId, sectionTypeLinkId, containTypeLinkId, section.title, deep));
        processComments(section.comments, sectionLinkId);

        section.chapters.forEach(chapter => {
            const chapterLinkId = reservedIds.pop();
            operations.push(createLinkOperation(chapterLinkId, chapterTypeLinkId, containTypeLinkId, chapter.title, deep, sectionLinkId));
            processComments(chapter.comments, chapterLinkId);

            chapter.articles.forEach(article => {
                const articleLinkId = reservedIds.pop();
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

function createLinkOperation(linkId, type, contain, title, deep, parentId = 19750) {
    return {
        table: 'links',
        type: 'insert',
        objects: {
            id: linkId,
            type_id: type,
            in: {
                data: parentId ? [{
                    type_id: contain,
                    from_id: parentId,
                    string: { data: { value: title } },
                }] : [],
            },
        },
    };
}

async function getLinksUp(deep, id) {
    return await deep.select({
        up: {
            parent_id: id,
        }
    });
}


function processDeepLinks(deep, rootId) {
    // Получаем все связи типа 'Contain' для корневого узла
    const sectionLinks = deep.minilinks.byId[rootId].outByType[containTypeLinkId];

    sectionLinks.forEach(sectionLink => {
        const sectionId = sectionLink.to.id;
        const sectionTitle = sectionLink.string.value;
        console.log(`Section ID: ${sectionId}`);
        console.log(`Section Title: ${sectionTitle}`);

        // Получаем все связи типа 'Contain' для каждого раздела
        const articleLinks = deep.minilinks.byId[sectionId].outByType[containTypeLinkId];
        if (articleLinks !== undefined) {
            articleLinks.forEach(articleLink => {
                const articleId = articleLink.to.id;
                const articleTitle = articleLink.string.value;
                console.log(`  Article ID: ${articleId}`);
                console.log(`  Article Title: ${articleTitle}`);
                const clauseLinks = deep.minilinks.byId[articleId].outByType[containTypeLinkId];
                if (clauseLinks !== undefined) {
                    clauseLinks.forEach(clauseLink => {
                        const clauseId = clauseLink.id;
                        const clauseTitle = clauseLink.string.value;
                        console.log(`    Clause ID: ${clauseId}`);
                        console.log(`    Clause Title: ${clauseTitle}`);
                    });
                }
            });
        }

    });
}

function rebuildHtmlFromDeepLinks(deep, rootId) {
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

let html = fs.readFileSync(path.join(sourceDirectory, sourceFileName), 'utf8');
let json = htmlToJson(html);
saveFile(path.join(targetDirectory, targetFileName), JSON.stringify(json, null, 2));

// const deep = makeDeepClient()
// const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain')
// console.log('containTypeLinkId', containTypeLinkId);

// processHtmlAndCreateLinks(json);

// getLinksUp(deep, 20203).then((result) => {
//     deep.minilinks.apply(result.data);
//     const html = rebuildHtmlFromDeepLinks(deep, 20203);

//     saveFile('rebuilt.html', html);

// });

