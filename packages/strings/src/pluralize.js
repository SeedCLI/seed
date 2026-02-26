// ─── Irregular words ───
const irregulars = [
    ["child", "children"],
    ["person", "people"],
    ["man", "men"],
    ["woman", "women"],
    ["mouse", "mice"],
    ["goose", "geese"],
    ["tooth", "teeth"],
    ["foot", "feet"],
    ["ox", "oxen"],
    ["leaf", "leaves"],
    ["life", "lives"],
    ["knife", "knives"],
    ["wife", "wives"],
    ["half", "halves"],
    ["self", "selves"],
    ["calf", "calves"],
    ["loaf", "loaves"],
    ["wolf", "wolves"],
];
const singularToPlural = new Map();
const pluralToSingular = new Map();
for (const [s, p] of irregulars) {
    singularToPlural.set(s, p);
    pluralToSingular.set(p, s);
}
// ─── Uncountable words ───
const uncountable = new Set([
    "fish",
    "sheep",
    "series",
    "species",
    "deer",
    "moose",
    "aircraft",
    "bison",
    "buffalo",
    "salmon",
    "trout",
    "data",
    "information",
    "equipment",
    "news",
    "advice",
    "furniture",
    "luggage",
    "rice",
    "money",
    "music",
]);
// ─── Plural rules (order matters — more specific first) ───
const pluralRules = [
    [/s$/i, "ses"],
    [/(ax|test)is$/i, "$1es"],
    [/(octop|vir)us$/i, "$1i"],
    [/(alias|status)$/i, "$1es"],
    [/(bu|mis|gas)s$/i, "$1ses"],
    [/(buffal|tomat|potat|volcan|her)o$/i, "$1oes"],
    [/([dti])um$/i, "$1a"],
    [/sis$/i, "ses"],
    [/(?:([^f])fe|([lr])f)$/i, "$1$2ves"],
    [/(hive)$/i, "$1s"],
    [/([^aeiouy]|qu)y$/i, "$1ies"],
    [/(x|ch|ss|sh)$/i, "$1es"],
    [/(matr|vert|append)ix$/i, "$1ices"],
    [/$/, "s"],
];
const singularRules = [
    [/ses$/i, "s"],
    [/(n)ews$/i, "$1ews"],
    [/([dti])a$/i, "$1um"],
    [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, "$1$2sis"],
    [/(^analy)ses$/i, "$1sis"],
    [/([^f])ves$/i, "$1fe"],
    [/(hive)s$/i, "$1"],
    [/(tive)s$/i, "$1"],
    [/([lr])ves$/i, "$1f"],
    [/([^aeiouy]|qu)ies$/i, "$1y"],
    [/series$/i, "series"],
    [/movies$/i, "movie"],
    [/(x|ch|ss|sh)es$/i, "$1"],
    [/(m)ice$/i, "$1ouse"],
    [/(bus)es$/i, "$1"],
    [/(shoe)s$/i, "$1"],
    [/(o)es$/i, "$1"],
    [/(cris|ax|test)es$/i, "$1is"],
    [/(octop|vir)i$/i, "$1us"],
    [/(alias|status)es$/i, "$1"],
    [/^(ox)en/i, "$1"],
    [/(vert|ind)ices$/i, "$1ex"],
    [/(matr)ices$/i, "$1ix"],
    [/(quiz)zes$/i, "$1"],
    [/s$/i, ""],
];
export function plural(str) {
    const lower = str.toLowerCase();
    if (uncountable.has(lower))
        return str;
    const irregular = singularToPlural.get(lower);
    if (irregular)
        return irregular;
    for (const [rule, replacement] of pluralRules) {
        if (rule.test(str)) {
            return str.replace(rule, replacement);
        }
    }
    return str;
}
export function singular(str) {
    const lower = str.toLowerCase();
    if (uncountable.has(lower))
        return str;
    const irregular = pluralToSingular.get(lower);
    if (irregular)
        return irregular;
    for (const [rule, replacement] of singularRules) {
        if (rule.test(str)) {
            return str.replace(rule, replacement);
        }
    }
    return str;
}
export function isPlural(str) {
    return plural(singular(str)) === str.toLowerCase();
}
export function isSingular(str) {
    return singular(str) === str.toLowerCase();
}
//# sourceMappingURL=pluralize.js.map