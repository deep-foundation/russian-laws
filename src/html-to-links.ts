import { DeepClient } from "@deep-foundation/deeplinks/imports/client";
import { htmlToJson } from "./html-to-json";
import { JsonToLinks } from "./json-to-links";
import { log } from "./log";


export async function htmlToLinks({deep, html ,documentLinkId}: {deep: DeepClient; html: string; documentLinkId: number }) {

    const json = htmlToJson({ html });
    log({json})

    const jsonToLinks = await JsonToLinks.new({
        deep
    })
   const result = jsonToLinks.convert({json,documentLinkId})
   return result;
}
