import { Comment } from "./Comment.js";

export type Article = { title: string; clauses: Array<string>; comments: Array<Comment>; };
