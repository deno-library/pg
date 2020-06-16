// copy from postgres-array

class ArrayParser {
  source: string;
  transform: Function;
  position = 0;
  entries: any[] = [];
  recorded: any[] = [];
  dimension = 0;

  constructor(source: string, transform: Function | undefined) {
    this.source = source;
    this.transform = transform || identity;
  }

  isEof() {
    return this.position >= this.source.length;
  }

  nextCharacter() {
    let character = this.source[this.position++];
    if (character === "\\") {
      return {
        value: this.source[this.position++],
        escaped: true,
      };
    }
    return {
      value: character,
      escaped: false,
    };
  }

  record(character: string) {
    this.recorded.push(character);
  }

  newEntry(includeEmpty: boolean = false) {
    let entry;
    if (this.recorded.length > 0 || includeEmpty) {
      entry = this.recorded.join("");
      if (entry === "NULL" && !includeEmpty) {
        entry = null;
      }
      if (entry !== null) entry = this.transform(entry);
      this.entries.push(entry);
      this.recorded = [];
    }
  }

  consumeDimensions() {
    if (this.source[0] === "[") {
      while (!this.isEof()) {
        let char = this.nextCharacter();
        if (char.value === "=") break;
      }
    }
  }

  parse(nested = false) {
    let character, parser, quote;
    this.consumeDimensions();
    while (!this.isEof()) {
      character = this.nextCharacter();
      if (character.value === "{" && !quote) {
        this.dimension++;
        if (this.dimension > 1) {
          parser = new ArrayParser(
            this.source.substr(this.position - 1),
            this.transform,
          );
          this.entries.push(parser.parse(true));
          this.position += parser.position - 2;
        }
      } else if (character.value === "}" && !quote) {
        this.dimension--;
        if (!this.dimension) {
          this.newEntry();
          if (nested) return this.entries;
        }
      } else if (character.value === '"' && !character.escaped) {
        if (quote) this.newEntry(true);
        quote = !quote;
      } else if (character.value === "," && !quote) {
        this.newEntry();
      } else {
        this.record(character.value);
      }
    }
    if (this.dimension !== 0) {
      throw new Error("array dimension not balanced");
    }
    return this.entries;
  }
}

function identity(value: string) {
  return value;
}

export default function (source: string, transform: Function | undefined) {
  return new ArrayParser(source, transform).parse();
}
