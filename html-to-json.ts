import { JSDOM } from "jsdom";
import { Section } from "./section.js";
import { Chapter } from "./chapter.js";
import { Article } from "./article.js";
import { Comment } from "./comment.js";

export function htmlToJson({ html }: { html: string; }) {
    const result: { preamble: Array<string>; sections: Array<Section>; preambleComments: Array<Comment>; } = { preamble: [], sections: [], preambleComments: [] };
    const dom = new JSDOM(html);
    const paragraphs = [...dom.window.document.querySelectorAll("p")];

    let currentSection: Section | null = null;
    let currentChapter: Chapter | null = null;
    let currentArticle: Article | null = null;
    let preambleMode = true;

    for (const p of paragraphs) {
        if (!p.textContent) {
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
        if (p.classList.contains("H") || p.classList.contains("T") || (text.startsWith("(") || p.classList.contains("I"))) {
            preambleMode = false;
            let paragraphType;
            if (text.startsWith("РАЗДЕЛ") || text.startsWith("Раздел")) paragraphType = "section";
            if (text.startsWith("ГЛАВА") || text.startsWith("Глава")) paragraphType = "chapter";
            if (text.startsWith("Статья")) paragraphType = "article";
            if (text.startsWith("(") || p.classList.contains("I")) paragraphType = "comment";

            switch (paragraphType) {
                case "section":
                    currentSection = { title: htmlContent, chapters: [], comments: [] };
                    result.sections.push(currentSection);
                    currentChapter = null;
                    currentArticle = null;
                    break;
                case "chapter":
                    currentChapter = { title: htmlContent, articles: [], comments: [] };
                    if (currentSection) {
                        currentSection.chapters.push(currentChapter);
                    } else {
                        currentSection = { title: "", chapters: [currentChapter], comments: [] };
                        result.sections.push(currentSection);
                    }
                    currentArticle = null;
                    break;
                case "article":
                    currentArticle = { title: htmlContent, clauses: [], comments: [] };
                    if (currentChapter) {
                        currentChapter.articles.push(currentArticle);
                    } else {
                        currentChapter = { title: "", articles: [currentArticle], comments: [] };
                        if (currentSection) {
                            currentSection.chapters.push(currentChapter);
                        } else {
                            currentSection = { title: "", chapters: [currentChapter], comments: [] };
                            result.sections.push(currentSection);
                        }
                    }
                    break;
                case "comment":
                    const comment: Comment = { text: htmlContent };
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
            currentChapter.articles.push({ title: "", clauses: [htmlContent], comments: [] });
        } else if (currentSection) {
            currentSection.chapters.push({ title: "", articles: [{ title: "", clauses: [htmlContent], comments: [] }], comments: [] });
        } else {
            result.preamble.push(htmlContent);
        }
    }

    return result;
}
