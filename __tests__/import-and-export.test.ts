import fsExtra from 'fs-extra';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { glob } from 'glob';
import cheerio from 'cheerio';
import { diffLines } from 'diff';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client.js';
import { generateApolloClient } from '@deep-foundation/hasura/client.js';
import { htmlToLinks } from '../html-to-links.js';
import { linksToHtml } from '../links-to-html.js';
import { log } from '../log.js';
import { expect, test, beforeAll, describe, it } from 'bun:test';
import { bool, cleanEnv, num, str } from 'envalid';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.tests.local' });

const env = cleanEnv(process.env, {
  GRAPHQL_PATH: str({ desc: 'Path to GraphQL endpoint' }),
  SSL: bool({
    desc: 'Should use SSL',
    default: true,
  }),
  HTML_FILE_NAMES: str({
    desc: "Comma-separated Html file names to test. Pass if you need to test specific file",
    default: "",
    example: "102041891.html"
  }),
  TIMEOUT: num({
    desc: "Timeout for tests",
    default: 10 * 60 * 60 * 1000,
    example: "10000"
  })
});

// Use when bun will be able to pass args to tests... https://github.com/oven-sh/bun/issues/9162
// const cliOptions = yargs(hideBin(process.argv)).options({
//   "html-file-name": {
//     alias: 'hfn',
//     demandOption: false,
//     describe: 'Html file name. Pass if you need to test specific file',
//     type: 'string'
//   }
// }).strict().parseSync()

let deep: DeepClient;

beforeAll(async () => {
  try {
    const apolloClient = generateApolloClient({
      path: env.GRAPHQL_PATH,
      ssl: env.SSL,
    });
    const unloginedDeep = new DeepClient({ apolloClient });
    const guestLoginResult = await unloginedDeep.guest();
    const guestDeep = new DeepClient({ deep: unloginedDeep, ...guestLoginResult });
    const adminLoginResult = await guestDeep.login({
      linkId: await guestDeep.id('deep', 'admin'),
    });
    deep = new DeepClient({ deep: guestDeep, ...adminLoginResult });
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
});

if (env.HTML_FILE_NAMES !== "") {
  it(`import and export ${env.HTML_FILE_NAMES}`, async () => {
    console.log(`HTML_FILE_NAMES environment variable is passed. Testing ${env.HTML_FILE_NAMES}`)
    try {
      const htmlFileNames = env.HTML_FILE_NAMES.split(',').map(htmlFileName => htmlFileName.trim())
      for (const htmlFileName of htmlFileNames) {
        const htmlFilePath = path.resolve('data', 'html', htmlFileName)
        const html = await fsExtra.readFile(htmlFilePath, 'utf8');
        await importAndExportTest({ html });
      }

    } catch (error) {
      console.error(`Error during import and export of ${env.HTML_FILE_NAMES}`, error);
      process.exit(1);
    }
  }, {
    timeout: env.TIMEOUT
  })
} else {
  console.log(`HTML_FILE_NAMES environment variable is not passed. Testing all files in data/html`)
  describe("import and export all", async () => {
    try {
      const files = await glob('data/html/*.html');
      for (const file of files) {
        it(`import and export ${file}`, async () => {
          const html = await fsExtra.readFile(file, 'utf8');
          await importAndExportTest({ html });
        }, {
          timeout: env.TIMEOUT,
        });
      }
    } catch (error) {
      console.error('Error during import and export all:', error);
      process.exit(1);
    }
  })
}


async function importAndExportTest(options: { html: string }) {
  try {
    const { html } = options;
    const initialHtmlParsed = cheerio.load(html);
    const initialHtmlTargetParagraph = initialHtmlParsed('body').find('p').filter(function () {
      return initialHtmlParsed(this).text().trim() === 'ОБЩАЯ ЧАСТЬ';
    });
    const initialHtmlParagraphsAfterTarget = initialHtmlTargetParagraph.nextAll('p').filter((index, element) => {
      const text = initialHtmlParsed(element).text().trim();
      return text !== '' && text !== '\u00A0';
    });

    const { data: [{ id: documentLinkId }] } = await deep.insert({
      type_id: deep.idLocal("@deep-foundation/core", "Space")
    })
    log({ documentLinkId })
    const processHtmlAndCreateLinksResult = await htmlToLinks({ deep, html: html, documentLinkId: documentLinkId })
    log({ processHtmlAndCreateLinksResult })
    const { data: linksDownToDocument } = await deep.select({
      up: {
        parent_id: documentLinkId,
      }
    })
    deep.minilinks.apply(linksDownToDocument);
    const exportedHtml = await linksToHtml({ deep, documentRootId: documentLinkId })
    log({ exportedHtml })
    const exportedHtmlParsed = cheerio.load(exportedHtml);
    const exportedHtmlParagraphs = exportedHtmlParsed('p');
    const diffResult = diffLines(html, exportedHtml)
    log({ diffResult })
    fsExtra.writeFileSync('initialParagraphs.html', initialHtmlParagraphsAfterTarget.map((i, paragraph) => initialHtmlParsed(paragraph).text()).get().join('\n'), { encoding: 'utf-8' })
    fsExtra.writeFileSync('exportedParagraphs.html', exportedHtmlParagraphs.map((i, paragraph) => exportedHtmlParsed(paragraph).text()).get().join('\n'), { encoding: 'utf-8' })
    fsExtra.writeFileSync('initial.html', html, { encoding: 'utf-8' })
    fsExtra.writeFileSync('exported.html', exportedHtml, { encoding: 'utf-8' })
    fsExtra.writeFileSync('diff.txt', JSON.stringify(diffResult, null, 2), { encoding: 'utf-8' })
    const errors: Array<string> = []
    for (let i = 0; i < initialHtmlParagraphsAfterTarget.length; i++) {
      const initialHtmlParagraph = initialHtmlParagraphsAfterTarget[i];
      const exportedHtmlParagraph = exportedHtmlParagraphs[i];
      const trimmedInitialHtmlParagraphText = initialHtmlParsed(initialHtmlParagraph).text().trim();
      const trimmedExportedHtmlParagraphText = initialHtmlParsed(exportedHtmlParagraph).text().trim();
      if (trimmedInitialHtmlParagraphText !== trimmedExportedHtmlParagraphText) {
        errors.push(
          `Line: ${i + 1}. 
Expected: ${trimmedInitialHtmlParagraphText}
Got: ${trimmedExportedHtmlParagraphText}`
        )
      }
    }
    expect(errors).toBeEmpty()
  }
  catch (error) {
    console.error('Error during import and export test:', error);
    process.exit(1);
  }
}