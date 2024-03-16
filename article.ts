import { Clause } from "./clause.js";
import { Comment } from "./comment.js";
import type { HtmlItem } from "./html-item.js";

export class Article {
  constructor(private _config: { title: string; children: Array<HtmlItem> }) {}

  get title(): string {
    return this._config.title;
  }

  get children(): Array<HtmlItem> {
    return this._config.children;
  }
}