import { JSDOM } from "jsdom";
import { Section } from "./section.js";
import { Chapter } from "./chapter.js";
import { Article } from "./article.js";
import { Comment } from "./comment.js";
import type { HtmlItem } from "./html-item.js";
import type { Clause } from "./clause.js";
import type { Preamble } from "./preamble.js";

export function htmlToJson({ html }: { html: string; }) {
    const result: { preamble: Array<Preamble>; sections: Array<Section>; preambleComments: Array<Comment>; } = { preamble: [], sections: [], preambleComments: [] };
    const dom = new JSDOM(html);
    const paragraphs = [...dom.window.document.querySelectorAll("p")];

    let currentSection: Section | null = null;
    let currentChapter: Chapter | null = null;
    let currentArticle: Article | null = null;
    let currentHtmlItem: HtmlItem | null = null;
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

        const isSection = p.classList.contains("T") && text.toLowerCase().startsWith("раздел");
        const isChapter = p.classList.contains("H") && text.toLowerCase().startsWith("глава");
        const isArticle = p.classList.contains("H") && text.toLowerCase().startsWith("статья");
        const isComment = p.classList.contains("I") || text.startsWith("(")

        if (preambleMode && !isChapter && !isSection) {
            const preamble: Preamble = {title: htmlContent, next: null};
            result.preamble.push(preamble);
            continue;
        }
        if (isSection || isChapter || isArticle || isComment) {
            preambleMode = false;
            let paragraphType;
            if (isSection) paragraphType = "section";
            if (isChapter) paragraphType = "chapter";
            if (isArticle) paragraphType = "article";
            if (isComment) paragraphType = "comment";

            switch (paragraphType) {
                case "section":
                    currentSection = { title: htmlContent, chapters: [], comments: [], next: null };
                    if(currentHtmlItem) {
                        currentHtmlItem.next = currentSection;
                    }
                    currentHtmlItem = currentSection;
                    result.sections.push(currentSection);
                    currentChapter = null;
                    currentArticle = null;
                    break;
                case "chapter":
                    currentChapter = { title: htmlContent, articles: [], comments: [] , next: null};
                    if(currentHtmlItem) {
                        currentHtmlItem.next = currentChapter;
                    }
                    currentHtmlItem = currentChapter
                    if (currentSection) {
                        currentSection.chapters.push(currentChapter);
                    } else {
                        currentSection = { title: "", chapters: [currentChapter], comments: [], next: null };
                        result.sections.push(currentSection);
                    }
                    currentArticle = null;
                    break;
                case "article":
                    currentArticle = { title: htmlContent, clauses: [], comments: [], next: null };
                    if(currentHtmlItem) {
                        currentHtmlItem.next = currentArticle;
                    }
                    currentHtmlItem = currentArticle;
                    if (currentChapter) {
                        currentChapter.articles.push(currentArticle);
                    } else {
                        currentChapter = { title: "", articles: [currentArticle], comments: [], next: null };
                        if (currentSection) {
                            currentSection.chapters.push(currentChapter);
                        } else {
                            currentSection = { title: "", chapters: [currentChapter], comments: [] , next: null};
                            result.sections.push(currentSection);
                        }
                    }
                    break;
                case "comment":
                    const comment: Comment = { text: htmlContent , next: null};
                    if(currentHtmlItem) {
                        currentHtmlItem.next = comment;
                    }
                    currentHtmlItem = comment;
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
            const clause: Clause = {title: htmlContent, next: null};
            currentArticle.clauses.push(clause);
        } else if (currentChapter) {
            const clause: Clause = {title: htmlContent, next: null};
            currentChapter.articles.push({ title: "", clauses: [clause], comments: [], next: null });
        } else if (currentSection) {
            const clause: Clause = {title: htmlContent, next: null};
            currentSection.chapters.push({ title: "", articles: [{ title: "", clauses: [clause], comments: [], next: null }], comments: [], next: null });
        } else {
            const preamble: Preamble = {title: htmlContent, next: null};
            result.preamble.push(preamble);
        }
    }

    return result;
}
