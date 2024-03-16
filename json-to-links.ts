import type {
  DeepClient,
  DeepClientResult,
  SerialOperation,
} from "@deep-foundation/deeplinks/imports/client.js";
import { Comment } from "./comment.js";
import type { Codex } from "./codex.js";
import { log } from "./log.js";
import { createSerialOperation } from "@deep-foundation/deeplinks/imports/gql/serial.js";
import { Chapter } from "./chapter.js";
import { Article } from "./article.js";
import { Section } from "./section.js";
import { Clause } from "./clause.js";
import type { HtmlItem } from "./html-item.js";

export class JsonToLinks {
  private _reservedLinkIds: number[] = [];
  private containTypeLinkId: number;
  private commentTypeLinkId: number;
  private articleTypeLinkId: number;
  private sectionTypeLinkId: number;
  private chapterTypeLinkId: number;
  private clauseTypeLinkId: number;
  private indexTypeLinkId: number;

  constructor(
    private _config: {
      deep: DeepClient;
      containTypeLinkId: number;
      commentTypeLinkId: number;
      articleTypeLinkId: number;
      sectionTypeLinkId: number;
      chapterTypeLinkId: number;
      clauseTypeLinkId: number;
      indexTypeLinkId: number;
    }
  ) {
    this.containTypeLinkId = _config.containTypeLinkId;
    this.commentTypeLinkId = _config.commentTypeLinkId;
    this.articleTypeLinkId = _config.articleTypeLinkId;
    this.sectionTypeLinkId = _config.sectionTypeLinkId;
    this.chapterTypeLinkId = _config.chapterTypeLinkId;
    this.clauseTypeLinkId = _config.clauseTypeLinkId;
    this.indexTypeLinkId = _config.indexTypeLinkId;
  }

  static async new(config: { deep: DeepClient }) {
    const { deep } = config;
    const containTypeLinkId = await deep.id("@deep-foundation/core", "Contain");
    const commentTypeLinkId = await deep.id("@deep-foundation/law", "Comment");
    const articleTypeLinkId = await deep.id("@deep-foundation/law", "Article");
    const sectionTypeLinkId = await deep.id("@deep-foundation/law", "Section");
    const chapterTypeLinkId = await deep.id("@deep-foundation/law", "Chapter");
    const clauseTypeLinkId = await deep.id("@deep-foundation/law", "Clause");
    const indexTypeLinkId = await deep.id("@deep-foundation/law", "Index");
    return new JsonToLinks({
      articleTypeLinkId,
      chapterTypeLinkId,
      clauseTypeLinkId,
      commentTypeLinkId,
      containTypeLinkId,
      indexTypeLinkId,
      sectionTypeLinkId,
      ...config,
    });
  }

  countLinksToReserveForHtmlItem(options:{htmlItem: HtmlItem}) {
    const {htmlItem} = options
    let count = 
    1+ // item
    1+ // contain for item
    1+ // index for item
    1 // contain for index
    if(htmlItem instanceof Section || htmlItem instanceof Chapter || htmlItem instanceof Article) {
      for (const childHtmlItem of htmlItem.children) {
        const childCount = this.countLinksToReserveForHtmlItem({htmlItem: childHtmlItem})
        count += childCount
      }
    }
    return count;
  }

  countLinksToReserve({ json }: { json: Codex }) {
    let count = 0;
    json.children.forEach((childHtmlItem) => {
      const childCount = this.countLinksToReserveForHtmlItem({htmlItem: childHtmlItem})      
      count+=childCount
    });
    return count;
  }

  async convert({
    json,
    documentLinkId,
  }: {
    json: Codex;
    documentLinkId: number;
  }) {
    const { deep } = this._config;

    const linksNumberToReserve = this.countLinksToReserve({ json });
    log({ linksNumberToReserve });

    async function reserveItemsInBatches({
      totalItems,
      batchSize,
    }: {
      totalItems: number;
      batchSize: number;
    }) {
      const reservedIds = [];
      const numBatches = Math.ceil(totalItems / batchSize);

      for (let i = 0; i < numBatches; i++) {
        const batch = Math.min(batchSize, totalItems - i * batchSize);
        const reserved = await deep.reserve(batch);
        reservedIds.push(...reserved);
        log(`Reserved ${reservedIds.length} / ${totalItems}`);
      }

      return reservedIds;
    }

    const reservedIds = await reserveItemsInBatches({
      totalItems: linksNumberToReserve,
      batchSize: 100,
    });
    this._reservedLinkIds = reservedIds;

    // const reservedIds = await deep.reserve(linksToReserve);
    log({ reservedIds });

    const operations = this.makeHtmlItemsOperations({
      parentLinkId: documentLinkId,
      items: json.children
    });

    log({ operations });

    // const chunkSize = 100;

    // // Split array into chunks
    // const operationsChunks = [];
    // for (let i = 0; i < operations.length; i += chunkSize) {
    //   operationsChunks.push(operations.slice(i, i + chunkSize));
    // }

    // for (const operationsChunk of operationsChunks) {
    //   const chunkResult = await deep.serial({ operations: operationsChunk });
    //   log({ chunkResult });
    // }

    for (const operation of operations) {
      await deep.serial({
        operations: [operation]
      })
    }
  }

  makeHtmlItemsOperations({
    items: items,
    parentLinkId,
  }: {
    items: Array<HtmlItem>;
    parentLinkId: number;
  }) {
    const fnLog = log.extend(this.makeHtmlItemsOperations.name);
    return items.flatMap((item, index) => {
      fnLog({ item, index });
      const { operations } = this.makeHtmlItemOperations({
        index,
        parentLinkId,
        item,
      });
      return operations;
    });
  }



  makeHtmlItemOperations({
    item: item,
    parentLinkId,
    index,
  }: {
    item: HtmlItem;
    parentLinkId: number;
    index: number;
  }) {
    if (typeof index !== 'number') {
      throw new Error("No index");
    }
    const operations: Array<SerialOperation> = [];
    const linkId = this._reservedLinkIds.pop();
    const containLinkId = this._reservedLinkIds.pop();
    const indexLinkId = this._reservedLinkIds.pop();
    log({ linkId, containLinkId, indexLinkId });
    if (!linkId || !containLinkId || !indexLinkId) {
      throw new Error("No reserved id");
    }
    let typeLinkId: number;
    if(item instanceof Section) {
      typeLinkId = this.sectionTypeLinkId
    } else if (item instanceof Chapter) {
      typeLinkId = this.chapterTypeLinkId
    } else if (item instanceof Article) {
      typeLinkId = this.articleTypeLinkId
    } else if (item instanceof Comment) {
      typeLinkId = this.commentTypeLinkId
    } else if (item instanceof Clause) {
      typeLinkId = this.clauseTypeLinkId
    } else {
      throw new Error(`Type of ${item} is not Section/Chapter/Article/Comment/Clause`)
    }
    let value: string;
    if(item instanceof Section || item instanceof Chapter || item instanceof Article) {
      value = item.title
    } else if (item instanceof Comment || item instanceof Clause) {
      value = item.text
    } else {
      throw new Error(`Type of ${item} is not Section/Chapter/Article/Comment/Clause`)
    }
    const itemInsertOperation = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: linkId,
        type_id: typeLinkId,
      },
    });
    operations.push(itemInsertOperation);
    const stringInsertOperation = createSerialOperation({
      table: "strings",
      type: "insert",
      objects: {
        link_id: linkId,
        value: value,
      },
    });
    operations.push(stringInsertOperation);
    const containInsertOperation = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        type_id: this.containTypeLinkId,
        from_id: parentLinkId,
        to_id: linkId,
      },
    });
    operations.push(containInsertOperation);
    const indexInsertOperation = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: indexLinkId,
        type_id: this.indexTypeLinkId,
        from_id: parentLinkId,
        to_id: linkId,
      },
    });
    operations.push(indexInsertOperation);
    const indexNumberInsertOperation = createSerialOperation({
      table: "numbers",
      type: "insert",
      objects: {
        link_id: indexLinkId,
        value: index,
      },
    });
    operations.push(indexNumberInsertOperation);
    const containForIndexInsertOperation = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: containLinkId,
        type_id: this.containTypeLinkId,
        from_id: parentLinkId,
        to_id: indexLinkId,
      },
    });
    operations.push(containForIndexInsertOperation);

    const isComment = item instanceof Comment;
    const isClause = item instanceof Clause
    const hasChildren = !isComment && !isClause
    if(hasChildren) {
      const children = item.children
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const {operations: childOperations} = this.makeHtmlItemOperations({
          index: i,
          parentLinkId: linkId,
          item: child
        })
        operations.push(...childOperations)
      }
    }

    return {
      operations,
      linkId,
      indexLinkId,
      containLinkId,
    };
  }


}
