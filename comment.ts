import type { Article } from "./article";
import type { HtmlItem } from "./html-item";

export type Comment = { text: string; next: HtmlItem | null;};