import parseArray from "./arrayParser.ts";

const map = new Map();

const parseBool = (s: string) => {
  if (s === null) return s;
  return s === "TRUE" ||
    s === "t" ||
    s === "true" ||
    s === "y" ||
    s === "yes" ||
    s === "on" ||
    s === "1";
};
map.set(16, parseBool);
map.set(20, BigInt); // int8
map.set(21, parseInt);
map.set(23, parseInt);
map.set(26, parseInt);

map.set(700, parseFloat);
map.set(701, parseFloat);

map.set(1082, (s: string) => {
  const date = new Date(s);
  date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
  return date;
});
map.set(1114, (s: string) => new Date(s));
map.set(1184, (s: string) => new Date(s));
map.set(114, JSON.parse); // json
map.set(3802, JSON.parse); // jsonb

const parseIntArray = (s: string) => parseArray(s, parseInt);
map.set(1005, parseIntArray);
map.set(1007, parseIntArray);
map.set(1028, parseIntArray);

const parseStringArray = (s: string) => parseArray(s, undefined);
map.set(651, parseStringArray); // cidr[]
map.set(1231, parseStringArray); // _numeric
map.set(1014, parseStringArray); // char
map.set(1015, parseStringArray); // varchar
map.set(1008, parseStringArray);
map.set(1009, parseStringArray);
map.set(1040, parseStringArray); // macaddr[]
map.set(1041, parseStringArray); // inet[]
map.set(3907, parseStringArray); // numrange[]
map.set(2951, parseStringArray); // uuid[]
map.set(791, parseStringArray); // money[]
map.set(1183, parseStringArray); // time[]
map.set(1270, parseStringArray); // timetz[]

const parseFloatArray = (s: string) => parseArray(s, parseFloat);
map.set(1021, parseFloatArray); // _float4
map.set(1022, parseFloatArray); // _float8

const parseJsonArray = (s: string) => parseArray(s, JSON.parse);
map.set(199, parseJsonArray); // json[]
map.set(3807, parseJsonArray); // jsonb[]

const parsePoint = (s: string) => {
  if (s[0] !== "(") return null;
  const arr = s.substring(1, s.length - 1).split(",");
  return {
    x: parseFloat(arr[0]),
    y: parseFloat(arr[1]),
  };
};
map.set(600, parsePoint); // point
const parsePointArray = (s: string) => {
  if (!s) return null;
  return parseArray(s, parsePoint);
};
map.set(1017, parsePointArray); // point[]

const parseDate = (s: string, parser: Function) => {
  if (s === null) return s;
  s = s.replace(/[^{},]+/g, '"$&"').replace(/{/g, "[").replace(/}/g, "]");
  return JSON.parse(s, function (k, v) {
    if (Array.isArray(v)) return v;
    return parser(v);
  });
};
// or use parseArray instead of parseDate
map.set(1115, (s: string) => parseDate(s, (s: string) => new Date(s))); // timestamp without time zone[]
map.set(1182, (s: string) =>
  parseDate(s, (s: string) => {
    const date = new Date(s);
    date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
    return date;
  })); // _date
map.set(1185, (s: string) => parseDate(s, (s: string) => new Date(s))); // timestamp with time zone[]

map.set(1000, (s: string) => parseArray(s, parseBool));

const parseBigIntArray = (s: string) => parseArray(s, BigInt);
map.set(1016, parseBigIntArray); // _int8

export default map;
