export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

export type XmlParse = { ok: true; root: XmlNode } | { ok: false; message: string };

/** A small XML reader for the SVG subset. Custom entities and DOCTYPE are rejected. */
export function parseXml(source: string): XmlParse {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) {
    return { ok: false, message: "DOCTYPE and entity declarations are not imported." };
  }
  const parser = new Parser(source);
  const nodes: XmlNode[] = [];
  while (parser.skipPreamble()) {
    const node = parser.element();
    if (!node) return { ok: false, message: parser.error ?? "XML did not parse." };
    nodes.push(node);
  }
  if (parser.error) return { ok: false, message: parser.error };
  if (nodes.length !== 1) return { ok: false, message: "SVG source must have one root element." };
  return { ok: true, root: nodes[0]! };
}

class Parser {
  error: string | undefined;
  private index = 0;

  constructor(private readonly source: string) {}

  skipPreamble(): boolean {
    for (;;) {
      this.skipSpace();
      if (this.index >= this.source.length) return false;
      if (this.source.startsWith("<?", this.index)) {
        const end = this.source.indexOf("?>", this.index);
        if (end < 0) {
          this.fail("Unclosed XML declaration.");
          return false;
        }
        this.index = end + 2;
        continue;
      }
      if (this.source.startsWith("<!--", this.index)) {
        const end = this.source.indexOf("-->", this.index);
        if (end < 0) {
          this.fail("Unclosed comment.");
          return false;
        }
        this.index = end + 3;
        continue;
      }
      return this.source[this.index] === "<";
    }
  }

  element(): XmlNode | undefined {
    if (this.error || this.source[this.index] !== "<") return undefined;
    this.index += 1;
    if (this.source[this.index] === "!" || this.source[this.index] === "?") {
      this.fail("Unsupported XML declaration inside the document.");
      return undefined;
    }
    const name = this.readName();
    if (!name) return undefined;
    const attrs: Record<string, string> = {};
    for (;;) {
      this.skipSpace();
      if (this.source.startsWith("/>", this.index)) {
        this.index += 2;
        return { name, attrs, children: [], text: "" };
      }
      if (this.source[this.index] === ">") {
        this.index += 1;
        break;
      }
      const key = this.readName();
      if (!key) return undefined;
      this.skipSpace();
      if (this.source[this.index] !== "=") {
        this.fail("Attribute is missing a value.");
        return undefined;
      }
      this.index += 1;
      this.skipSpace();
      const value = this.readValue();
      if (value === undefined) return undefined;
      attrs[key] = value;
    }
    const children: XmlNode[] = [];
    let text = "";
    while (!this.error && this.index < this.source.length) {
      if (this.source.startsWith("</", this.index)) {
        this.index += 2;
        const close = this.readName();
        this.skipSpace();
        if (this.source[this.index] !== ">" || close !== name) {
          this.fail(`Expected </${name}>.`);
          return undefined;
        }
        this.index += 1;
        return { name, attrs, children, text };
      }
      if (this.source.startsWith("<!--", this.index)) {
        const end = this.source.indexOf("-->", this.index);
        if (end < 0) {
          this.fail("Unclosed comment.");
          return undefined;
        }
        this.index = end + 3;
        continue;
      }
      if (this.source[this.index] === "<") {
        const child = this.element();
        if (!child) return undefined;
        children.push(child);
        continue;
      }
      const next = this.source.indexOf("<", this.index);
      const raw = this.source.slice(this.index, next < 0 ? this.source.length : next);
      text += decode(raw, (message) => this.fail(message));
      this.index = next < 0 ? this.source.length : next;
      if (this.error) return undefined;
    }
    this.fail(`Unclosed <${name}>.`);
    return undefined;
  }

  private readName(): string | undefined {
    const start = this.index;
    while (this.index < this.source.length && /[A-Za-z0-9:_.-]/.test(this.source[this.index]!)) this.index += 1;
    if (this.index === start) {
      this.fail("Expected a name.");
      return undefined;
    }
    const raw = this.source.slice(start, this.index);
    const colon = raw.lastIndexOf(":");
    return colon >= 0 ? raw.slice(colon + 1) : raw;
  }

  private readValue(): string | undefined {
    const quote = this.source[this.index];
    if (quote !== "\"" && quote !== "'") {
      this.fail("Attribute values must be quoted.");
      return undefined;
    }
    this.index += 1;
    const end = this.source.indexOf(quote, this.index);
    if (end < 0) {
      this.fail("Unclosed attribute.");
      return undefined;
    }
    const raw = this.source.slice(this.index, end);
    this.index = end + 1;
    const value = decode(raw, (message) => this.fail(message));
    return this.error ? undefined : value;
  }

  private skipSpace(): void {
    while (this.index < this.source.length && /\s/.test(this.source[this.index]!)) this.index += 1;
  }

  private fail(message: string): void {
    if (!this.error) this.error = message;
  }
}

function decode(raw: string, fail: (message: string) => void): string {
  return raw.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);|&[^;]*;?/g, (token) => {
    if (token === "&amp;") return "&";
    if (token === "&lt;") return "<";
    if (token === "&gt;") return ">";
    if (token === "&quot;") return "\"";
    if (token === "&apos;") return "'";
    if (token.startsWith("&#x")) return String.fromCodePoint(Number.parseInt(token.slice(3, -1), 16));
    if (token.startsWith("&#")) return String.fromCodePoint(Number.parseInt(token.slice(2, -1), 10));
    fail(`Unknown entity ${token}.`);
    return "";
  });
}
