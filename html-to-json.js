import { JSDOM } from "jsdom";
import { saveFile } from './files.js';
import { program } from 'commander';
import path from 'path';
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

let html = fs.readFileSync(path.join(sourceDirectory, sourceFileName), 'utf8');
let json = htmlToJson(html);
saveFile(path.join(targetDirectory, targetFileName), JSON.stringify(json, null, 2));
