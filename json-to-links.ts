import type {
  DeepClient,
  SerialOperation,
} from "@deep-foundation/deeplinks/imports/client.js";
import { Comment } from "./comment.js";
import type { LawPage } from "./law-page.js";
import { log } from "./log.js";
import { createSerialOperation } from "@deep-foundation/deeplinks/imports/gql/serial.js";
import { Chapter } from "./chapter.js";
import { Article } from "./article.js";
import { Section } from "./section.js";
import { Clause } from "./clause.js";

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

  static async new(config: { deep: DeepClient; }) {
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

  makeCommentsOperations({
    comments,
    parentLinkId,
  }: {
    comments: Array<Comment>;
    parentLinkId: number;
  }) {
    return comments.flatMap((comment, commentIndex) => {
      const {operations} = this.makeCommentOperations({
        comment,
        index: commentIndex,
        parentLinkId: parentLinkId,
      });
      return operations;
    });
  }

  countLinksToReserve({ json }: { json: LawPage }) {
    let count = 0;
    json.sections.forEach((section) => {
      count++; // section
      count++; // contain for section
      count++; // index for section
      count++; // contain for index
      section.children.forEach((chapterOrComment) => {
        count++; // item
        count++; // contain for item
        count++; // index for item
        count++; // contain for index
        const hasChildren = "children" in chapterOrComment;
        if (hasChildren) {
          const chapter = chapterOrComment;
          chapter.children.forEach((articleOrComment) => {
            count++; // article
            count++; // contain for article
            count++; // index for article
            count++; // contain for index
            const hasChildren = "children" in articleOrComment;
            if (hasChildren) {
              const article = articleOrComment;
              article.children.forEach((commentOrClause) => {
                count++; // clause
                count++; // contain for clause
                count++; // index for clause
                count++; // contain for index
              });
            }
          });
        }
      });
    });
    return count;
  }

  async convert({ json, documentLinkId }: { json: LawPage, documentLinkId: number }) {
    const { deep } = this._config;

    const linksToReserve = this.countLinksToReserve({ json });
    log({linksToReserve})

      async function reserveItemsInBatches({ totalItems, batchSize }: { totalItems: number; batchSize: number; }) {
        const reservedIds = [];
        const numBatches = Math.ceil(totalItems / batchSize);
        
        for (let i = 0; i < numBatches; i++) {
            const batch = Math.min(batchSize, totalItems - i * batchSize);
            const reserved = await deep.reserve(batch);
            reservedIds.push(reserved);
            log(`Reserved ${reserved.length}. Total reserved ${reservedIds.length} / ${totalItems}`)
        }
        
        return reservedIds.flat();
    }
    
    const totalItemsToReserve = 5000; // Example: total number of items to reserve
    const batchSize = 100; // Example: batch size
    
    const reservedIds = await reserveItemsInBatches({ totalItems: totalItemsToReserve, batchSize });
    this._reservedLinkIds = reservedIds;

    // const reservedIds = await deep.reserve(linksToReserve);
    log({ reservedIds });

    const operations = this.makeSectionsOperations({
        documentLinkId,
        sections: json.sections
    })

    log({ operations });
    const result = await deep.serial({ operations });
    log({ result });
    return result;
  }


  makeSectionsOperations({
    sections,
    documentLinkId
  }: {
    sections: Array<Section>;
    documentLinkId: number;
  }) {
    return sections.flatMap((section, sectionIndex) => {
        return this.makeSectionOperations({
            section,
            index: sectionIndex,
            documentLinkId
        });
    })
  }

  makeSectionOperations({
    section,
    index,
    documentLinkId
  }: {
    section: Section;
    index: number;
    documentLinkId: number
  }) {
    const operations: Array<SerialOperation> = [];

    const {
        operations: sectionInsertOperations,
        linkId
    } = this.makeHtmlItemOperations({
        index,
        parentLinkId: documentLinkId,
        typeLinkId: this.sectionTypeLinkId,
        value: section.title
    })
    operations.push(...sectionInsertOperations);

    const comments = section.comments;
    const commentOperations = this.makeCommentsOperations({
      comments,
      parentLinkId: linkId,
    });
    operations.push(...commentOperations);

    const chapterOperations = this.makeChaptersOperations({
        chapters: section.chapters,
        sectionLinkId: linkId
    });
    operations.push(...chapterOperations);

    return operations;
  }

  makeChaptersOperations({
    chapters,
    sectionLinkId,
  }: {
    chapters: Array<Chapter>;
    sectionLinkId: number;
  }) {
    return chapters.flatMap(
        (chapter, chapterIndex) => {
          return this.makeChapterOperations({
            chapter,
            index: chapterIndex,
            sectionLinkId,
          });
        }
      )
  }

  makeChapterOperations({
    chapter,
    sectionLinkId,
    index,
  }: {
    chapter: Chapter;
    sectionLinkId: number;
    index: number;
  }) {
    const operations: Array<SerialOperation> = [];


    const {
        operations: chapterInsertOperations,
        linkId
    } = this.makeHtmlItemOperations({
        parentLinkId: sectionLinkId,
        typeLinkId: this.chapterTypeLinkId,
        value: chapter.title,
        index
    })
    operations.push(...chapterInsertOperations);

    const commentsInsertOperations = this.makeCommentsOperations({
        comments: chapter.comments,
        parentLinkId: linkId,
      });
    operations.push(...commentsInsertOperations);

    const articleOperations = this.makeArticlesOperations({
        articles: chapter.articles,
        chapterLinkId: linkId,
    });
    operations.push(...articleOperations);

    return operations;
  }

  makeArticlesOperations({
    articles,
    chapterLinkId,
  }: {
    articles: Array<Article>;
    chapterLinkId: number;
  })  {
    return articles.flatMap(
        (article, articleIndex) => {
          return this.makeArticleOperations({
            article,
            index: articleIndex,
            chapterLinkId
          });
        }
      )
  }

  makeArticleOperations({
    article,
    chapterLinkId,
    index,
  }: {
    article: Article;
    chapterLinkId: number;
    index: number;
  }) {
    const operations: Array<SerialOperation> = [];

    const {
        linkId,
        operations: articleInsertOperations
    } = this.makeHtmlItemOperations({
        index,
        parentLinkId: chapterLinkId,
        typeLinkId: this.articleTypeLinkId,
        value: article.title
    })
    operations.push(...articleInsertOperations);

    const clausesOperations = article.clauses.flatMap((clause, clauseIndex) => {
      const {operations} =  this.makeClauseOperations({ articleLinkId: linkId, clause, index: clauseIndex });
      return operations
    });
    operations.push(...clausesOperations);

    const commentsOperations = this.makeCommentsOperations({
        comments: article.comments,
        parentLinkId: linkId,
    }) ;
    operations.push(...commentsOperations);

    return operations;
  }

  makeClauseOperations({
    clause,
    articleLinkId,
    index,
  }: {
    clause: Clause;
    articleLinkId: number;
    index: number;
  }) {
    const operations = this.makeHtmlItemOperations({
        index,
        parentLinkId: articleLinkId,
        typeLinkId: this.clauseTypeLinkId,
        value: clause.text
    })
    return operations;
  }

  makeHtmlItemOperations({
    value,
    parentLinkId,
    index,
    typeLinkId
  }: {
    typeLinkId: number;
    value: string|number|object;
    parentLinkId: number;
    index: number;
  }) {
    const operations: Array<SerialOperation> = [];
    const linkId = this._reservedLinkIds.pop();
    const containLinkId = this._reservedLinkIds.pop();
    const indexLinkId = this._reservedLinkIds.pop();
    log({ linkId, containLinkId,indexLinkId });
    if (!linkId || !containLinkId || !indexLinkId) {
      throw new Error("No reserved id");
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
      table: typeof value + 's' as 'strings' | 'numbers' | 'objects',
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
        to_id: index,
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
    return {
        operations,
        linkId,
        indexLinkId,
        containLinkId
    };
  }

  makeCommentOperations({
    comment,
    parentLinkId,
    index,
  }: {
    comment: Comment;
    parentLinkId: number;
    index: number;
  }) {
    return this.makeHtmlItemOperations({
        index,
        parentLinkId,
        typeLinkId: this.commentTypeLinkId,
        value: comment.text
    })
  }
}
