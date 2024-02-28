import { DeepClient, SerialOperation } from "@deep-foundation/deeplinks/imports/client.js";
import { createLinkOperation } from './create-link-operation.js';
import { createClauseOperation } from './create-clause-operation.js';
import { htmlToJson } from "./html-to-json.js";
import { Comment } from "./comment.js";
import { jsonToLinks } from "./json-to-links.js";


export async function htmlToLinks({deep, html ,spaceId}: {deep: DeepClient; html: string; spaceId: number }) {

    const json = htmlToJson({ html });

   const result = jsonToLinks({deep,json,spaceId})
   return result;
}
