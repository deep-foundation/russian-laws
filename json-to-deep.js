import { program } from 'commander';
import path from 'path';
import { generateApolloClient } from "@deep-foundation/hasura/client.js";
import { DeepClient, parseJwt } from "@deep-foundation/deeplinks/imports/client.js";
import fs from "fs";

program
    .option('--source-directory <type>', 'Source directory', './data/json')
    .option('--source-file-name <type>', 'Source file name (required)')
    .option('--source-file-extension <type>', 'Source file extension', '.json')
    .option('--target-space-id <type>', 'Target space id (required)')
    .parse(process.argv);

const options = program.opts();
if (!options.sourceFileName || !options.targetSpaceId) {
    console.log('--source-file-name and --target-space-id are required');
    process.exit(1);
}
const sourceFileName = options.sourceFileName + options.sourceFileExtension;
const sourceDirectory = options.sourceDirectory;
const targetSpaceId = options.targetSpaceId;

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

async function processHtmlAndCreateLinks(json, spaceId) {
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
        operations.push(createLinkOperation(sectionLinkId, sectionTypeLinkId, containTypeLinkId, section.title, deep, spaceId));
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

const deep = makeDeepClient()
const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain')
console.log('containTypeLinkId', containTypeLinkId);

const json = JSON.parse(fs.readFileSync(path.join(sourceDirectory, sourceFileName), 'utf8'));

processHtmlAndCreateLinks(json, targetSpaceId);