import axios from 'axios';
import iconv from 'iconv-lite';
import jsdom from "jsdom";
const { JSDOM } = jsdom;
import fs from 'fs';
import path from 'path';
import { saveFile } from './files.js';
import { program } from 'commander';
import cheerio from 'cheerio';
import {html as beautify} from 'js-beautify';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const options = yargs(hideBin(process.argv))
  .usage(`$0 [Options]`, `Description of the program`)
  .options({
    directory: {
      alias: "d",
      description: "Directory where the file is  located",
      type: "string",
      demandOption: false,
      default: './data/html'
    },
    name: {
      alias: "n",
      description: "File name",
      type: "string",
      demandOption: true
    },
    extension: {
      alias: "e",
      description: "File extension",
      type: "string",
      demandOption: false,
      default: '.html'
    },
    sourceDocumentId: {
      alias: "s",
      description: "Source Document ID",
      type: "string",
      demandOption: true
    }
  })
  .strict()
  .parseSync();

const fileName = options.name + options.extension
const directory = options.directory.endsWith('/') ? options.directory : options.directory + '/';  
let html = '';

const url = `http://pravo.gov.ru/proxy/ips/?doc_itself=&nd=${options.sourceDocumentId}&fulltext=1`;

function transformHtml({ html }: { html; }) {
  html = html.replace(/^.*<div\s*id="text_content"\s*>\s*/s, '');
  html = html.replace(/\s*<\/div>\s*<\/div>\s*<\/body>\s*<\/html>\s*$/s, '');
  html = html.replaceAll('windows-1251', 'utf-8');
  html = html.replace(/<head>.*?<\/head>/s, '');

    html = html.replaceAll('?docbody', 'http://pravo.gov.ru/proxy/ips/?docbody'); // обратные ссылки на источник

  const $ = cheerio.load(html);

  $('html').attr('style', 'display: table; margin: auto;');
  $('body').attr('style', `font-size: 18px; line-height: 125%; word-wrap: break-word; display: table-cell; vertical-align: middle;`);

  html = beautify($.html(), { indent_size: 2 });

  html = html.replaceAll('font-family: "times new roman", times, serif;', 'font-family: Helvetica, sans-serif;');

  return html;
}

axios({
    url: url,
    method: 'GET',
    responseType: 'arraybuffer'
})
  .then(function (response) {
    html = iconv.decode(Buffer.from(response.data), 'win1251');
    html = transformHtml({ html });
    saveFile(directory + fileName, html);
    console.log(`Document ${options.name} is loaded`);
  })
  .catch(function (error) {
    console.error(`Error on load of ${options.name} document`, error);
  });