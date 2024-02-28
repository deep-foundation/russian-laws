import { Comment } from "./comment.js";

export type Article = { title: string; clauses: Array<string>; comments: Array<Comment>; };
