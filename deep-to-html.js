import { saveFile } from './files.js';
import { program } from 'commander';
import path from 'path';
import { generateApolloClient } from "@deep-foundation/hasura/client.js";
import { DeepClient, parseJwt } from "@deep-foundation/deeplinks/imports/client.js";

program
    .option('--source-document-root-id <type>', 'Source document root id (required)')
    .option('--target-directory <type>', 'Target directory', './data/html')
    .option('--target-file-name <type>', 'Target file name (required)')
    .option('--target-file-extension <type>', 'Target file extension', '.html')
    .parse(process.argv);

const options = program.opts();
if (!options.sourceDocumentRootId || !options.targetFileName) {
    console.log('--source-document-root-id and --target-file-name are required');
    process.exit(1);
}
const sourceDocumentRootId = options.sourceDocumentRootId;
const targetFileName = options.targetFileName + options.targetFileExtension;
const targetDirectory = options.targetDirectory;

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

async function getLinksDown(deep, rootId) {
    return await deep.select({
        up: {
            parent_id: rootId,
        }
    });
}

function processDeepLinks(deep, documentRootId) {
    // Получаем все связи типа 'Contain' для корневого узла
    const sectionLinks = deep.minilinks.byId[documentRootId].outByType[containTypeLinkId];

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

function rebuildHtmlFromDeepLinks(deep, documentRootId) {
    let htmlContent = "";

    const sectionLinks = deep.minilinks.byId[documentRootId].outByType[containTypeLinkId];
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

const deep = makeDeepClient()
const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain')
console.log('containTypeLinkId', containTypeLinkId);

getLinksDown(deep, sourceDocumentRootId).then((result) => {
    deep.minilinks.apply(result.data);
    const html = rebuildHtmlFromDeepLinks(deep, sourceDocumentRootId);
    saveFile(path.join(targetDirectory, targetFileName), html);
});
