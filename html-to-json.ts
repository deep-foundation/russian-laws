import { JSDOM } from "jsdom";
import { Section } from "./section.js";
import { Chapter } from "./chapter.js";
import { Article } from "./article.js";
import { Comment } from "./comment.js";
import type { HtmlItem } from "./html-item.js";
import { Clause } from "./clause.js";

export function htmlToJson({ html }: { html: string }) {
  const result: {
    preamble: Array<string>;
    sections: Array<Section>;
    preambleComments: Array<Comment>;
  } = { preamble: [], sections: [], preambleComments: [] };
  const dom = new JSDOM(html);
  const paragraphs = [...dom.window.document.querySelectorAll("p")];

  let preambleMode = true;

  let commentOrClauseParent: Section | Chapter | Article | null = null;

  for (const p of paragraphs) {
    if (!p.textContent) {
      throw new Error("Empty paragraph");
    }
    let text = p.textContent.trim();
    const htmlContent = p.innerHTML.trim();
    if (htmlContent === "&nbsp;" || !text) {
      continue;
    }

    const isSection =
      p.classList.contains("T") && text.toLowerCase().startsWith("раздел");
    const isChapter =
      p.classList.contains("H") && text.toLowerCase().startsWith("глава");
    const isArticle =
      p.classList.contains("H") && text.toLowerCase().startsWith("статья");
    const isComment = p.classList.contains("I") || text.startsWith("(");

    if (preambleMode && !isChapter && !isSection) {
      result.preamble.push(htmlContent);
      continue;
    }
    if (isSection || isChapter || isArticle || isComment) {
      preambleMode = false;
      if (isSection) {
        const section = new Section({ title: htmlContent, children: [] });
        commentOrClauseParent = section;
        result.sections.push(section);
      } else if (isChapter) {
        const chapter = new Chapter({ title: htmlContent, children: [] });
        commentOrClauseParent = chapter;
        const parentSection = result.sections[result.sections.length - 1];
        parentSection.children.push(chapter);
      } else if (isArticle) {
        const article = new Article({ title: htmlContent, children: [] });
        commentOrClauseParent = article;
        const parentSection = result.sections[result.sections.length - 1];
        const parent =
          parentSection.children[parentSection.children.length - 1];
        const isParentChapter = 'children' in parent;
        if(isParentChapter) {
            parent.children.push(article);
        }
      } else if (isComment) {
        const comment = new Comment({ text: htmlContent });
        if (commentOrClauseParent) {
        //   @ts-ignore I have no idea why error is here. All (SectionChild|ChapterChild|ArticleChild) match Comment
          commentOrClauseParent.children.push(comment);
        } else {
            result.preambleComments.push(comment);
        }
      } 
    } else if (commentOrClauseParent instanceof Article) {
      const clause = new Clause({ text: htmlContent });
      commentOrClauseParent.children.push(clause);
    } else {
      result.preamble.push(htmlContent);
    }
  }
  return result;
}
