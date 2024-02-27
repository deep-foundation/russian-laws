import fsExtra from 'fs-extra'
import path from 'path'
import { processHtmlAndCreateLinks } from '../processHtmlAndCreateLinks.js';

it('import and export',  async() => {
  const filePath = path.join('..', 'data', 'html', '102041891');
  const html = fsExtra.readFileSync(filePath, {encoding: 'utf8'});
  const processHtmlAndCreateLinksResult = await processHtmlAndCreateLinks({html})
  console.log({processHtmlAndCreateLinksResult})
});
