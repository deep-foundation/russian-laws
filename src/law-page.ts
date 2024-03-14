import { Comment } from "./comment";
import { Section } from "./section";

export type LawPage = {
  preamble: Array<string>;
  sections: Array<Section>;
  preambleComments: Array<Comment>;
}