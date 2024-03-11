import { Article } from "./article.js";
import type { Clause } from "./clause.js";
import { Comment } from "./comment.js";

export type ChapterChild = Article | Comment;
export class Chapter {
  constructor(private _config: { title: string; children: Array<ChapterChild> }) {}

  get title(): string {
    return this._config.title;
  }

  get children(): Array<ChapterChild> {
    return this._config.children;
  }

  get comments(): Comment[] {
    return this._config.children.filter((child): child is Comment => {
      return child instanceof Comment;
    });
  }

  get articles(): Article[] {
    return this._config.children.filter((child): child is Article => {
      return child instanceof Article;
    });
  }
}