import { Comment } from "./comment.js";
import type { HtmlItem } from "./html-item.js";
import { Section } from "./section.js";

export class Codex {
  preamble: Array<string>;
  children: Array<HtmlItem>;
  preambleComments: Array<Comment>;

  constructor({preamble, children, preambleComments}: {preamble: Array<string>, children: Array<HtmlItem>, preambleComments: Array<Comment>}) {
    this.preamble = preamble;
    this.children = children;
    this.preambleComments = preambleComments
  }
}