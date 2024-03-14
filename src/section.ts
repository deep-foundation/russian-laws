import { Chapter } from "./chapter";
import { Comment } from "./comment";

export type SectionChild = Chapter | Comment;
export class Section {
  constructor(private _config: { title: string; children: Array<SectionChild> }) {}

  get title(): string {
    return this._config.title;
  }

  get children(): Array<SectionChild> {
    return this._config.children;
  }

  get comments(): Comment[] {
    return this._config.children.filter((child): child is Comment => {
      return child instanceof Comment;
    });
  }

  get chapters(): Chapter[] {
    return this._config.children.filter((child): child is Chapter => {
      return child instanceof Chapter;
    });
  }
}
