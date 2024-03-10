import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { htmlToJson } from "./html-to-json.js";
import { JsonToLinks } from "./json-to-links.js";
import { log } from "./log.js";


export async function htmlToLinks({deep, html ,documentLinkId}: {deep: DeepClient; html: string; documentLinkId: number }) {

    const json = htmlToJson({ html });
    log({json})

    const jsonToLinks = await JsonToLinks.new({
        deep
    })
   const result = jsonToLinks.convert({json,documentLinkId})
   return result;
}
