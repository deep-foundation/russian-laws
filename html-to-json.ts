import {saveFile} from './files.js';

import fs from "fs";
import { rebuildHtmlFromDeepLinks } from "./rebuildHtmlFromDeepLinks.js";

export const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain')
console.log('containTypeLinkId', containTypeLinkId);
//
// let html = fs.readFileSync('./data/html/102110364.html', 'utf8');
// let result = htmlToJson(html);
// saveFile('./data/json/102110364.json', JSON.stringify(result, null, 2));
// processHtmlAndCreateLinks(html);
deep.select({
    up: {
        parent_id: 20203,
    }
}).then((result) => {
    deep.minilinks.apply(result.data);
    const html = rebuildHtmlFromDeepLinks({ deep, rootId: 20203 });

    saveFile({ filePath: 'rebuilt.html', content: html });

});
