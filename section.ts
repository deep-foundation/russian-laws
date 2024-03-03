import { Chapter } from "./chapter.js";
import type { HtmlItem } from "./html-item.js";

export type Section = { title: string; chapters: Array<Chapter>; comments: Array<any>; next: HtmlItem | null };
