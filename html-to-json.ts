import {JSDOM} from "jsdom";
import {saveFile} from './files.js';

import {generateApolloClient} from "@deep-foundation/hasura/client.js";
import {DeepClient, parseJwt} from "@deep-foundation/deeplinks/imports/client.js";
import {createSerialOperation} from "@deep-foundation/deeplinks/imports/gql/index.js";
import fs from "fs";
import { rebuildHtmlFromDeepLinks } from "./rebuildHtmlFromDeepLinks.js";
// Преобразование HTML к JSON

export const makeDeepClient = () => {
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


    const deepClient = new DeepClient({ apolloClient, linkId, token});
    return deepClient;
}

type Section = { title: string, chapters: Array<Chapter> ,comments: Array<any> } | null
type Chapter = { title: string, articles: Array<Article>, comments: Array<any> } | null
type Article = { title: string, clauses: Array<string> , comments: Array<any>} | null

export function htmlToJson(html) {
    const result: {preamble: Array<string>; sections: Array<any>, preambleComments: Array<any>} = { preamble: [], sections: [],preambleComments: [] };
    const dom = new JSDOM(html);
    const paragraphs = [...dom.window.document.querySelectorAll("p")];

    let currentSection:  Section= null;
    let currentChapter: Chapter = null;
    let currentArticle: Article = null;
    let preambleMode = true;

    for (const p of paragraphs) {
        if(!p.textContent) {
            throw new Error('Empty paragraph');
        }
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
                    currentSection = { title: htmlContent, chapters: [],comments: []};
                    result.sections.push(currentSection);
                    currentChapter = null;
                    currentArticle = null;
                    break;
                case "chapter":
                    currentChapter = { title: htmlContent, articles: [],comments: []};
                    if (currentSection) {
                        currentSection.chapters.push(currentChapter);
                    } else {
                        currentSection = { title: "", chapters: [currentChapter] ,comments: []};
                        result.sections.push(currentSection);
                    }
                    currentArticle = null;
                    break;
                case "article":
                    currentArticle = { title: htmlContent, clauses: [], comments: [] };
                    if (currentChapter) {
                        currentChapter.articles.push(currentArticle);
                    } else {
                        currentChapter = { title: "", articles: [currentArticle],comments: []};
                        if (currentSection) {
                            currentSection.chapters.push(currentChapter);
                        } else {
                            currentSection = { title: "", chapters: [currentChapter] ,comments: []};
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
            currentChapter.articles.push({ title: "", clauses: [htmlContent],comments: []});
        } else if (currentSection) {
            currentSection.chapters.push({ title: "", articles: [{ title: "", clauses: [htmlContent],comments: [] }], comments: [] });
        } else {
            result.preamble.push(htmlContent);
        }
    }

    return result;
}


export function createClauseOperation(clause, articleLinkId, clauseTypeLinkId, containTypeLinkId ) {
    return createSerialOperation({
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
    });
}

export function createLinkOperation(linkId: number, type: number, contain: number, title: string, deep: DeepClient, parentId = 19750) {

    return createSerialOperation({
        table: 'links',
        type: 'insert' ,
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

const deep = makeDeepClient()
export const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain')
console.log('containTypeLinkId', containTypeLinkId);
//
// let html = fs.readFileSync('./data/html/102110364.html', 'utf8');
// let result = htmlToJson(html);
// saveFile('./data/json/102110364.json', JSON.stringify(result, null, 2));
// processHtmlAndCreateLinks(html);
deep.select({
    up: {
        parent_id: 20203,
    }
}).then((result) => {
    deep.minilinks.apply(result.data);
    const html = rebuildHtmlFromDeepLinks(deep, 20203);

    saveFile('rebuilt.html', html);

});
