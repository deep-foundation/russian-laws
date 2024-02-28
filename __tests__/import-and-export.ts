import fsExtra from 'fs-extra'
import path from 'path'
import { processHtmlAndCreateLinks } from '../process-html-and-create-links.js';

it('import and export',  async() => {
  const filePath = path.join('..', 'data', 'html', '102041891');
  const html = fsExtra.readFileSync(filePath, {encoding: 'utf8'});
  const processHtmlAndCreateLinksResult = await processHtmlAndCreateLinks({deep, html})
  console.log({processHtmlAndCreateLinksResult})
});
