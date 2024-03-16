import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { log } from "./log";
import type { Link } from "@deep-foundation/deeplinks/imports/minilinks";

export class LinksToHtml {
  private _sectionTypeLinkId: number;
  private _chapterTypeLinkId: number;
  private _articleTypeLinkId: number;
  private _commentTypeLinkId: number;
  private _clauseTypeLinkId: number;
  private _indexTypeLinkId: number;

  constructor(options: {
    sectionTypeLinkId: number;
    chapterTypeLinkId: number;
    articleTypeLinkId: number;
    commentTypeLinkId: number;
    clauseTypeLinkId: number;
    indexTypeLinkId: number;
  }) {
    this._sectionTypeLinkId = options.sectionTypeLinkId
    this._chapterTypeLinkId = options.chapterTypeLinkId
    this._articleTypeLinkId = options.articleTypeLinkId
    this._commentTypeLinkId = options.commentTypeLinkId
    this._clauseTypeLinkId = options.clauseTypeLinkId
    this._indexTypeLinkId = options.indexTypeLinkId
  }

  static async new(options: {
    deep: DeepClient
  }) {
    const {deep} = options;
    const sectionTypeLinkId = await deep.id("@deep-foundation/law", "Section")
    const chapterTypeLinkId = await deep.id("@deep-foundation/law", "Chapter")
    const articleTypeLinkId = await deep.id("@deep-foundation/law", "Article")
    const commentTypeLinkId = await deep.id("@deep-foundation/law", "Comment")
    const clauseTypeLinkId = await deep.id("@deep-foundation/law", "Clause")
    const indexTypeLinkId = await deep.id("@deep-foundation/law", "Index");
    const linksToHtml = new LinksToHtml({
      articleTypeLinkId,
      chapterTypeLinkId,
      clauseTypeLinkId,
      commentTypeLinkId,
      indexTypeLinkId,
      sectionTypeLinkId
    })
    return linksToHtml;
  }

  async convert({
    deep,
    codexLinkId,
  }: {
    deep: DeepClient;
    codexLinkId: number;
  }) {
    const codexLink = deep.minilinks.byId[codexLinkId];
    log({ codexLinkId });

    const htmlContent = this._processLink({link: codexLink})
     
    const result = `<html><body>${htmlContent}</body></html>`;
    log({ result });
    return result;
  }

  private _processLink(options: {
    link: Link<number>
  }) {
    const {link} = options;
    let htmlContent = "";
    const indexLinks = link.outByType[this._indexTypeLinkId]?.sort((a,b) => a.value.value - b.value.value);
    log({indexLinks})
    const childLinks = indexLinks?.map((link) => link.to);
    log({ childLinks });
    for (const childLink of childLinks) {
      const text = childLink["string"].value;
      
      if(childLink.type_id === this._sectionTypeLinkId) {
        htmlContent += `<p class="T">${text}</p>\n`;
      } else if(childLink.type_id === this._chapterTypeLinkId) {
        htmlContent += `<p class="H C">${text}</p>\n`;
      } else if (childLink.type_id === this._articleTypeLinkId) {
        htmlContent += `<p class="H">${text}</p>\n`;
      } else if (childLink.type_id === this._commentTypeLinkId) {
        htmlContent += `<p>${text}</p>\n`;
      } else if (childLink.type_id === this._clauseTypeLinkId) {
        htmlContent += `<p>${text}</p>\n`;
      } else {
        throw new Error(`type ##${childLink.type_id} of ##${childLink.id} is not any of ${JSON.stringify([this._sectionTypeLinkId, this._chapterTypeLinkId, this._articleTypeLinkId, this._commentTypeLinkId, this._clauseTypeLinkId])}`)
      }
  
      const indexLinks = childLink.outByType[this._indexTypeLinkId]?.sort((a,b) => a.value.value - b.value.value);
      log({indexLinks})
      const childLinks = indexLinks?.map((link) => link.to);
      log({ childLinks });
      if(childLinks) {
        for (const childLink of childLinks) {
          const childHtmlContent = this._processLink({link: childLink})
          htmlContent += childHtmlContent;
        }
      }
    }

    return htmlContent
  }
  
}


