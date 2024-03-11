import { Comment } from "./comment.js";
import { Section } from "./section.js";

export type LawPage = {
  preamble: Array<string>;
  sections: Array<Section>;
  preambleComments: Array<Comment>;
}