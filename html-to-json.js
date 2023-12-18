import { JSDOM } from "jsdom";
import fs from 'fs';
import path from 'path';
import { saveFile } from './files.js';

import { generateApolloClient } from "@deep-foundation/hasura/client.js";
import { DeepClient, parseJwt } from "@deep-foundation/deeplinks/imports/client.js";
// Преобразование HTML к JSON

const makeDeepClient = () => {
    let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzgwIn0sImlhdCI6MTcwMjcwNjI0OX0.Fx8J0SE0Ufhckb-1VSgTdx2Kmn5pR8eF-8jPhgTyXKk"
    let GQL_URN = "3006-deepfoundation-dev-yjb479rm43x.ws-eu107.gitpod.io/gql"
    let GQL_SSL = "1"
    if (!token) throw new Error('No token provided');
    const decoded = parseJwt(token);
    const linkId = decoded?.userId;
    const apolloClient = generateApolloClient({
        path: GQL_URN,
        ssl: !!+GQL_SSL,
        token,
    });


    const deepClient = new DeepClient({ apolloClient, linkId, token});
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
        const text = p.textContent.trim();
        if (!text) continue;

        if (preambleMode && !p.classList.contains("H") && !p.classList.contains("T")) {
            result.preamble.push(text);
            continue;
        }

        if (p.classList.contains("H") || p.classList.contains("T")) {
            preambleMode = false;

            if (text.startsWith("РАЗДЕЛ") || text.startsWith("Раздел")) {
                currentSection = { title: text, chapters: [] };
                result.sections.push(currentSection);
                currentChapter = null;
                currentArticle = null;
            } else if (text.startsWith("ГЛАВА") || text.startsWith("Глава")) {
                currentChapter = { title: text, articles: [] };
                if (currentSection) {
                    currentSection.chapters.push(currentChapter);
                } else {
                    currentSection = { title: "", chapters: [currentChapter] };
                    result.sections.push(currentSection);
                }
                currentArticle = null;
            } else if (text.startsWith("Статья")) {
                currentArticle = { title: text, clauses: [] };
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
            }
        } else if (currentArticle) {
            currentArticle.clauses.push(text);
        } else if (currentChapter) {
            currentChapter.articles.push({ title: "", clauses: [text] });
        } else if (currentSection) {
            currentSection.chapters.push({ title: "", articles: [{ title: "", clauses: [text] }] });
        } else {
            result.preamble.push(text);
        }
    }

    return result;
}


function createClauseOperation(clause, articleLinkId, clauseTypeLinkId, containTypeLinkId ) {
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

async function processHtmlAndCreateLinks(html) {
    let deep = makeDeepClient();
    const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain')

    const articleTypeLinkId = await deep.id('@senchapencha/law', 'Article')
    const sectionTypeLinkId = await deep.id('@senchapencha/law', 'Section')
    const chapterTypeLinkId = await deep.id('@senchapencha/law', 'Chapter')
    const clauseTypeLinkId = await deep.id('@senchapencha/law', 'Clause')
    console.log('containTypeLinkId', containTypeLinkId);
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

    let operations = [];
    json.sections.forEach(section => {
        const sectionLinkId = reservedIds.pop();
        operations.push(createLinkOperation(sectionLinkId, sectionTypeLinkId, containTypeLinkId,section.title, deep));
        section.chapters.forEach(chapter => {
            const chapterLinkId = reservedIds.pop();
            if (chapter.title !== null && chapter.title !== undefined && chapter.title !== "") {
                operations.push(createLinkOperation(chapterLinkId, chapterTypeLinkId, containTypeLinkId,chapter.title, deep, sectionLinkId));
            }
            chapter.articles.forEach(article => {
                const articleLinkId = reservedIds.pop();
                if (article.title !== null && article.title !== undefined && article.title !== "") {
                    operations.push(createLinkOperation(articleLinkId, articleTypeLinkId, containTypeLinkId, article.title, deep, chapterLinkId));
                }
                article.clauses.forEach(clause => {
                    if (clause !== null && clause !== undefined && clause !== "")
                    {
                        operations.push(createClauseOperation(clause, articleLinkId, clauseTypeLinkId, containTypeLinkId));
                    }
                });
            });
        });
    });

    const result = await deep.serial({ operations });
    return result;
}

function createLinkOperation(linkId, type, contain, title, deep, parentId = 7748) {

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

async function text(deep) {
    const results = await deep.select({
        up: {
            parent_id: 8485,
        }
    });
    return results;
}

// const html = fs.readFileSync('./data/html/102110364.html', 'utf8');
// const json = processHtmlAndCreateLinks(html);
// console.log('json', json);
// // console.log('json.sections[0].chapters', json.sections[0].chapters);
//
// saveFile('./data/json/102110364.json', JSON.stringify(json, null, 2));

const deep = makeDeepClient()
const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain')
console.log('containTypeLinkId', containTypeLinkId);
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
                if (clauseLinks !== undefined){
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
        htmlContent += `<h1>${sectionTitle}</h1>\n`;

        const articleLinks = deep.minilinks.byId[sectionId].outByType[containTypeLinkId];
        articleLinks?.forEach(articleLink => {
            const articleId = articleLink.to.id;
            const articleTitle = articleLink.string.value;
            htmlContent += `<h2>${articleTitle}</h2>\n`;

            const clauseLinks = deep.minilinks.byId[articleId].outByType[containTypeLinkId];
            clauseLinks?.forEach(clauseLink => {
                const clauseTitle = clauseLink.string.value;
                htmlContent += `<p>${clauseTitle}</p>\n`;
            });
        });
    });

    return `<html><body>${htmlContent}</body></html>`;
}
text(deep).then((result) => {

    deep.minilinks.apply(result.data);
    const html = rebuildHtmlFromDeepLinks(deep, 8485);
    console.log(html);

    // Если нужно сохранить HTML в файл
    saveFile('rebuilt.html', html);

});