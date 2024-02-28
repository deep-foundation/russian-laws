import { Chapter } from "./chapter.js";

export type Section = { title: string; chapters: Array<Chapter>; comments: Array<any>; };
