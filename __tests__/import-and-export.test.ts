import fsExtra from 'fs-extra'
import path from 'path'
import { htmlToLinks } from '../html-to-links.js';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client.js';
import { generateApolloClient } from '@deep-foundation/hasura/client.js';
import {linksToHtml} from '../links-to-html.js'
import { log } from '../log.js';
import {expect, beforeAll, it} from 'bun:test'
import { bool, cleanEnv, str } from 'envalid';
import dotenv from 'dotenv'
dotenv.config({path: '.env.tests.local'});
import {diffLines} from 'diff';
import cheerio from 'cheerio'

const env = cleanEnv(process.env, {
  GRAPHQL_PATH: str({desc: "Path to GraphQL endpoint"}),
  SSL: bool({
    desc: "Should use SSL",
    default: true,
  }),
});

// const options = yargs(hideBin(process.argv))
//   .usage(`$0 [Options]`, `Description of the program`)
//   .options({
//     "graphql-path": {
//       alias: "gql-p",
//       description: "Path to GraphQL endpoint",
//       type: "string",
//       demandOption: true,
//     },
//     ssl: {
//       alias: "s",
//       description: "Should use SSL",
//       type: "boolean",
//     },
//   })
//   .strict()
//   .parseSync();

let deep: DeepClient;
beforeAll(async () => {
  const apolloClient = generateApolloClient({
    path: env.GRAPHQL_PATH,
    ssl: env.SSL,
  });
  const unloginedDeep = new DeepClient({ apolloClient });
  const guestLoginResult = await unloginedDeep.guest();
  const guestDeep = new DeepClient({ deep: unloginedDeep, ...guestLoginResult });
  const adminLoginResult = await guestDeep.login({
    linkId: await guestDeep.id("deep", "admin"),
  });
  deep = new DeepClient({ deep: guestDeep, ...adminLoginResult });
})

it('import and export',  async() => {
  const filePath = path.resolve('data', 'html', '102041891.html');
  log({filePath})
  const initialHtml = fsExtra.readFileSync(filePath, {encoding: 'utf8'});
  log({initialHtml})
  const initialHtmlParsed = cheerio.load(initialHtml);
  const initialHtmlTargetParagraph = initialHtmlParsed('body').find('p').filter(function() {
    return initialHtmlParsed(this).text().trim() === 'ОБЩАЯ ЧАСТЬ';
  });
  const initialHtmlParagraphsAfterTarget = initialHtmlTargetParagraph.nextAll('p').filter((index, element) => {
    const text = initialHtmlParsed(element).text().trim();
    return text !== '' && text !== '\u00A0'; 
  });

  const {data: [{id: documentLinkId}]} = await deep.insert({
    type_id: deep.idLocal("@deep-foundation/core", "Space")
  })
  log({documentLinkId})
  const processHtmlAndCreateLinksResult = await htmlToLinks({deep, html: initialHtml,documentLinkId: documentLinkId})
  log({processHtmlAndCreateLinksResult})
  // const documentLinkId = 147143
  const {data: linksDownToDocument} = await deep.select({
    up: {
        parent_id: documentLinkId,
    }
  })
  deep.minilinks.apply(linksDownToDocument);
  const exportedHtml = await linksToHtml({deep,documentRootId: documentLinkId})
  log({exportedHtml})
  const exportedHtmlParsed = cheerio.load(exportedHtml);
  const exportedHtmlParagraphs = exportedHtmlParsed('p');
  const diffResult = diffLines(initialHtml, exportedHtml)
  log({diffResult})
  fsExtra.writeFileSync('initialParagraphs.html', initialHtmlParagraphsAfterTarget.map((i,paragraph)=>initialHtmlParsed(paragraph).text()).get().join('\n'), {encoding: 'utf-8'})
  fsExtra.writeFileSync('exportedParagraphs.html', exportedHtmlParagraphs.map((i,paragraph)=>exportedHtmlParsed(paragraph).text()).get().join('\n'), {encoding: 'utf-8'})
  fsExtra.writeFileSync('initial.html', initialHtml, {encoding: 'utf-8'})
  fsExtra.writeFileSync('exported.html', exportedHtml, {encoding: 'utf-8'})
  fsExtra.writeFileSync('diff.txt', JSON.stringify(diffResult, null, 2), {encoding: 'utf-8'})
  for (let i = 0; i < initialHtmlParagraphsAfterTarget.length; i++) {
    const initialHtmlParagraph = initialHtmlParagraphsAfterTarget[i];
    const exportedHtmlParagraph = exportedHtmlParagraphs[i];
    expect(exportedHtmlParsed(exportedHtmlParagraph).text().trim()).toBe(initialHtmlParsed(initialHtmlParagraph).text().trim())
  }

}, {
  timeout: 3600000
});
