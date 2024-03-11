import { Clause } from "./clause.js";
import { Comment } from "./comment.js";

export type ArticleChild = Clause | Comment;

export class Article {
  constructor(private _config: { title: string; children: Array<ArticleChild> }) {}

  get title(): string {
    return this._config.title;
  }

  get children(): Array<ArticleChild> {
    return this._config.children;
  }

  get clauses(): Clause[] {
    return this._config.children.filter((child): child is Clause => {
      return child instanceof Clause;
    });
  }

  get comments(): Comment[] {
    return this._config.children.filter((child): child is Comment => {
      return child instanceof Comment;
    });
  }
}