import { Article } from "./article.js";
import type { HtmlItem } from "./html-item.js";


export type Chapter = { title: string; articles: Array<Article>; comments: Array<any>; next: HtmlItem | null };
