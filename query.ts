import Message from "./message.ts";
import binary from "./parserBinary.ts";
import text from "./parserText.ts";

const matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;

export default class Query {
  command: string | null = null;
  rowCount: number | null = null;
  oid: number | null = null;
  rows: any[] = [];
  fields: any[] = [];

  handleRowDescription(msg: Message): void {
    this.fields = msg.fields;
  }

  handleDataRow(msg: Message): void {
    const row: Record<string, unknown> = {};
    for (let i = 0, len = msg.fields.length; i < len; i++) {
      const { name, dataTypeID, format } = this.fields[i];
      const parsers = format === "text" ? text : binary;
      const parser = parsers.get(dataTypeID);
      const val = msg.fields[i];
      row[name] = parser && !this.isNullOrUndefined(val) ? parser(val) : val;
    }

    this.rows.push(row);
  }

  private isNullOrUndefined(val: unknown) {
    return val === null || val === undefined
  }

  handleCommandComplete(msg: Message) {
    //const match = msg.text.match(matchRegexp);
    const match = matchRegexp.exec(msg.text);

    if (!match) return;

    this.command = match[1];

    if (match[3]) {
      this.oid = parseInt(match[2], 10);
      this.rowCount = parseInt(match[3], 10);
    } else if (match[2]) {
      this.rowCount = parseInt(match[2], 10);
    }
  }
}
