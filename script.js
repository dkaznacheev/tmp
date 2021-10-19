'use strict';

/**
 * Телефонная книга
 */
const phoneBook = new Map();

/**
 * Вызывайте эту функцию, если есть синтаксическая ошибка в запросе
 * @param {number} lineNumber – номер строки с ошибкой
 * @param {number} charNumber – номер символа, с которого запрос стал ошибочным
 */
function syntaxError(lineNumber, charNumber) {
    throw new Error(`SyntaxError: Unexpected token at ${lineNumber}:${charNumber}`);
}

function parsePhonesAndMails(line) {
    let parts = line.split(' для контакта ');
    if (parts.length < 2) {
        return line.length - 1;
    }
    let phones = [];
    let emails = [];

    let fields = parts[0].split(' и ');
    for (let field of fields) {
        let sp = field.split(' ');
        if (sp.length !== 2) {
            return 0;
        }
        switch (sp[0]) {
            case 'телефон':
                let phone = sp[1];
                if (!(/\d{10}/.test(phone))) {
                    return 0;
                }
                phones.push(phone);
                break;
            case 'почту':
                emails.push(sp[1]);
                break;
            default:
                return 0;
        }
    }
    return { name: parts[1], phones: phones, emails: emails}
}

function parseShow(lineNum, line) {
    let parts = line.split(' для контактов, где есть ');
    if (parts.length < 2) {
        syntaxError(lineNum, line.length - 1 + 'Покажи '.length);
    }
    let fields = parts[0].split(' и ');
    let fn = 0;
    let res = [];
    for (let field of fields) {
        switch (field) {
            case 'имя':
                res.push("NAME");
                break;
            case 'телефоны':
                res.push("PHONES");
                break;
            case 'почты':
                res.push("EMAILS");
                break;
            default:
                syntaxError(lineNum, parts.slice(0, fn).reduce((a, b) => a + b, '').length + 'Покажи '.length);
                break;
        }
        fn++;
    }
    return { fields: res, where: parts[1] };
}

function parse(query) {
    let lines = query.split(';');
    lines = lines.slice(0, -1);
    let lineNum = 0;
    let queries = [];
    for (let line of lines) {
        lineNum++;
        if (/^Создай контакт /.test(line)) {
            queries.push({ type: 'CREATE', name: line.substr('Создай контакт '.length)});
            continue;
        }
        if (/^Удали контакт /.test(line)) {
            queries.push({ type: 'DELETE_NAME', name: line.substr('Удали контакт '.length)});
            continue;
        }
        if (/^Удали контакты, где есть /.test(line)) {
            queries.push({ type: 'DELETE_WHERE', substr: line.substr('Удали контакты, где есть '.length)});
            continue;
        }
        if (/^Добавь /.test(line)) {
            let parsed = parsePhonesAndMails(line.substr('Добавь '.length));
            if (typeof parsed === 'number') {
                syntaxError(lineNum, parsed + 'Добавь '.length)
            }
            parsed.type = 'ADD_INFO';
            queries.push(parsed);
            continue;
        }
        if (/^Удали /.test(line)) {
            let parsed = parsePhonesAndMails(line.substr('Удали '.length));
            if (typeof parsed === 'number') {
                syntaxError(lineNum, parsed + 'Удали '.length)
            }
            parsed.type = 'DELETE_INFO';
            queries.push(parsed);
            continue;
        }
        if (/^Покажи /.test(line)) {
            let parsed = parseShow(lineNum, line.substr('Покажи '.length));
            parsed.type = 'SHOW';
            queries.push(parsed);
            continue;
        }
        syntaxError(lineNum, 0);
    }
    return queries;
}

function phoneFormat(phone) {
    return `+7 (${phone.substring(0,3)}) ${phone.substring(3,6)}-${phone.substring(6,8)}-${phone.substring(8,10)}`;
}

/**
 * Выполнение запроса на языке pbQL
 * @param {string} query
 * @returns {string[]} - строки с результатами запроса
 */
function run(query) {
    let queries = parse(query)
    let results = [];
    for (let query of queries) {
        switch (query.type) {
            case 'CREATE':
                if (phoneBook.has(query.name)) {
                    break;
                }
                phoneBook.set(query.name, { phones: [], emails: []});
                break;
            case 'DELETE_NAME':
                if (phoneBook.has(query.name)) {
                    phoneBook.delete(query.name);
                }
                break;
            case 'DELETE_WHERE':
                if (query.where === '') break;
                phoneBook.forEach((value, key) => {
                    if (key.includes(query.where)) {
                        phoneBook.delete(key);
                    }
                });
                break;
            case 'ADD_INFO':
                if (!phoneBook.has(query.name)) {
                    break;
                }
                let entry = phoneBook.get(query.name)
                for (let phone of query.phones) {
                    if (!entry.phones.includes(phone)) {
                        entry.phones.push(phone);
                    }
                }
                for (let phone of query.emails) {
                    if (!entry.emails.includes(phone)) {
                        entry.emails.push(phone);
                    }
                }
                break;
            case 'DELETE_INFO':
                if (!phoneBook.has(query.name)) {
                    break;
                }
                let entryD = phoneBook.get(query.name)
                for (let phone of query.phones) {
                    let index = entryD.phones.indexOf(phone);
                    if (index > -1) {
                        entryD.phones.splice(index, 1);
                    }
                }
                for (let email of query.emails) {
                    let index = entryD.emails.indexOf(email);
                    if (index > -1) {
                        entryD.emails.splice(index, 1);
                    }
                }
                break;
            case 'SHOW':
                phoneBook.forEach((value, key) => {
                    if (key.includes(query.where)) {
                        let result = [];
                        for (let field of query.fields) {
                            switch (field) {
                                case 'NAME':
                                    result.push(key);
                                    break;
                                case 'PHONES':
                                    let phonesFormatted = [];
                                    for (let phone of value.phones) {
                                        phonesFormatted.push(phoneFormat(phone));
                                    }
                                    result.push(phonesFormatted.join(','))
                                    break;
                                case 'EMAILS':
                                    result.push(value.emails.join(','));
                                    break;
                            }
                        }
                        results.push(result.join(';'));
                    }
                });
                break;
        }
    }
    return results;
}

module.exports = { phoneBook, run };