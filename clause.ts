// export type Clause = {
//   text: string;
// }

export class Clause {
  text: string;
  constructor({ text }: { text: string; }) {
    this.text = text;
  }
}