import { JSDOM } from "jsdom";
import { Section } from "./section.js";
import { Chapter } from "./chapter.js";
import { Article } from "./article.js";
import { Comment } from "./comment.js";
import type { HtmlItem } from "./html-item.js";
import { Clause } from "./clause.js";
import { Codex } from "./codex.js";

export function htmlToJson({ html }: { html: string }) {
  const result = new Codex({ preamble: [], children: [], preambleComments: [] });
  const dom = new JSDOM(html);
  const paragraphs = Array.from(dom.window.document.querySelectorAll("p"));

  let preambleMode = true;

  const parents: (Codex | Section | Chapter | Article)[] = [result];

  for (const paragraph of paragraphs) {
    const text = paragraph.textContent?.trim();
    const htmlContent = paragraph.innerHTML.trim();
    
    if (!text || htmlContent === "&nbsp;") {
      continue;
    }

    const isSection = text.toLowerCase().startsWith("раздел") || paragraph.classList.contains("T");
    const isChapter = text.toLowerCase().startsWith("глава") && (paragraph.classList.contains("H") || paragraph.classList.contains("C"));
    const isArticle = text.toLowerCase().startsWith("статья") && paragraph.classList.contains("H");
    const isComment = text.startsWith("(") || paragraph.classList.contains("I");

    if (preambleMode && !isChapter && !isSection) {
      result.preamble.push(htmlContent);
      continue;
    }

    let parent: Codex | Section | Chapter | Article = parents[parents.length - 1];

    if (isSection || isChapter || isArticle) {
      for (let i = parents.length - 1; i >= 0; i--) {
        if (!(parents[i] instanceof Article)) {
          parent = parents[i];
          break;
        }
      }
      
      preambleMode = false;

      let htmlItem: HtmlItem;

      if (isSection) {
        htmlItem = new Section({ title: htmlContent, children: [] });
      } else if (isChapter) {
        htmlItem = new Chapter({ title: htmlContent, children: [] });
      } else if (isArticle) {
        htmlItem = new Article({ title: htmlContent, children: [] });
      } else {
        throw new Error(`Unreachable condition`);
      }
      parent.children.push(htmlItem)
    } else if (isComment) {
      const comment = new Comment({ text: htmlContent });
      if(parent instanceof Codex) {
        result.preambleComments.push(comment)
      } else {
        parent.children.push(comment)
      }
    } else if (parent instanceof Codex) {
      result.preamble.push(htmlContent);
    } else {
      parent.children.push(new Clause({ text: htmlContent }));
    }
  }

  return result;
}
