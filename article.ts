import type { Clause } from "./clause.js";
import { Comment } from "./comment.js";
import type { HtmlItem } from "./html-item.js";

export type Article = { title: string; clauses: Array<Clause>; comments: Array<Comment>; next: HtmlItem | null;};
