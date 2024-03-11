// export type Comment = { text: string; };
export class Comment {
  text: string;
  constructor({ text }: { text: string; }) {
    this.text = text;
  }
}