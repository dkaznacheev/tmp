'use strict';

const re = /(.{2}) (\d{2}):(\d{2})\+(\d{1,2})/
const week = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
const weekBase = 60 * 24;

function toInstant(time) {
    const m = re.exec(time);
    let inst = 0;
    inst += week.indexOf(m[1]) * weekBase;
    inst += parseInt(m[2]) * 60;
    inst += parseInt(m[3]);
    inst -= parseInt(m[4]) * 60;
    return inst;
}

function padZero(num) {
    return ('0' + num).slice(-2);
}

function formatInstant(inst, template, timezone) {
    const adjusted = inst + timezone * 60;
    return template
        .replace("%DD", week[Math.floor(adjusted / weekBase)])
        .replace("%HH", padZero(Math.floor((adjusted % weekBase) / 60)))
        .replace("%MM", padZero(adjusted % 60));
}


/**
 * @param {Object} schedule Расписание Банды
 * @param {number} duration Время на ограбление в минутах
 * @param {Object} workingHours Время работы банка
 * @param {string} workingHours.from Время открытия, например, "10:00+5"
 * @param {string} workingHours.to Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {
    let times = [0, 1, 2].map((n) => {
        return {
            personId: n,
            time: -weekBase,
            action: 1
        };
    });

    function addTimes(person, personId) {
        const pm = personId === 3 ? -1 : 1;
        for (const range of person) {
            times.push({personId: personId, time: toInstant(range.from), action: -1 * pm});
            times.push({personId: personId, time: toInstant(range.to), action: 1 * pm});
        }
    }

    addTimes(schedule.Danny, 0);
    addTimes(schedule.Rusty, 1);
    addTimes(schedule.Linus, 2);
    addTimes(week.slice(0, 3).map((day) => {
        return {
            from: day + ' ' + workingHours.from,
            to: day + ' ' + workingHours.to
        };
    }), 3);
    let bankZone = parseInt(workingHours.from.split('+')[1]);
    times.sort((t1, t2) =>
        t1.time === t2.time ? t2.action - t1.action : t1.time - t2.time
    );
    const map = new Map();
    map[0] = 0;
    map[1] = 0;
    map[2] = 0;
    map[3] = 0;

    function isActive() {
        return map[0] > 0 && map[1] > 0 && map[2] > 0 && map[3] > 0;
    }

    let startTime = null;
    let results = [];
    for (const event of times) {
        let wasActive = isActive()
        map[event.personId] += event.action;
        if (!wasActive && isActive()) {
            startTime = event.time;
        }
        if (wasActive && !isActive() && event.time - startTime >= duration) {
            results.push({from: startTime, to: event.time});
        }
    }
    let answer = results.length === 0 ? null : { index: 0, offset: 0 };

    return {
        /**
         * Найдено ли время
         * @returns {boolean}
         */
        exists() {
            return answer != null;
        },

        /**
         * Возвращает отформатированную строку с часами
         * для ограбления во временной зоне банка
         *
         * @param {string} template
         * @returns {string}
         *
         * @example
         * ```js
         * getAppropriateMoment(...).format('Начинаем в %HH:%MM (%DD)') // => Начинаем в 14:59 (СР)
         * ```
         */
        format(template) {
            if (answer == null) {
                return "";
            }
            return formatInstant(results[answer.index].from + answer.offset, template, bankZone);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @note Не забудь при реализации выставить флаг `isExtraTaskSolved`
         * @returns {boolean}
         */
        tryLater() {
            if (answer == null) {
                return false;
            }
            if (results[answer.index].to - results[answer.index].from - answer.offset - 30 >= duration) {
                answer.offset += 30;
                return true;
            }
            if (answer.index >= results.length - 1) {
                return false;
            }
            answer.index++;
            answer.offset = 0;
            return true;
        }
    };
}

module.exports = {
    getAppropriateMoment
};

const gangSchedule = {
    Danny: [/*{ from: 'ПН 12:00+5', to: 'ПН 17:00+5' }, { from: 'ВТ 13:00+5', to: 'ВТ 16:00+5' }*/],
    Rusty: [/*{ from: 'ПН 11:30+5', to: 'ПН 16:30+5' }, { from: 'ВТ 13:00+5', to: 'ВТ 16:00+5' }*/],
    Linus: [
/*        { from: 'ПН 09:00+3', to: 'ПН 14:00+3' },
        { from: 'ПН 21:00+3', to: 'ВТ 09:30+3' },
        { from: 'СР 09:30+3', to: 'СР 15:00+3' }*/
    ]
};

const bankWorkingHours = {
    from: '00:00+5',
    to: '23:59+5'
};

// Время не существует
const longMoment = getAppropriateMoment(gangSchedule, 121, bankWorkingHours);

// Выведется `false` и `""`
console.info(longMoment.exists());
console.info(longMoment.format('Метим на %DD, старт в %HH:%MM!'));

// Время существует
const moment = getAppropriateMoment(gangSchedule, 90, bankWorkingHours);

// Выведется `true` и `"Метим на ВТ, старт в 11:30!"`
console.info(moment.exists());
console.info(moment.format('Метим на %DD, старт в %HH:%MM!'));

moment.tryLater();
// `"ВТ 16:00"`
console.info(moment.format('%DD %HH:%MM'));

// Вернет `true`
moment.tryLater();
// `"ВТ 16:30"`
console.info(moment.format('%DD %HH:%MM'));

// Вернет `true`
moment.tryLater();
// `"СР 10:00"`
console.info(moment.format('%DD %HH:%MM'));

// Вернет `false`
console.log(moment.tryLater());
// `"СР 10:00"`
console.info(moment.format('%DD %HH:%MM'));

while (moment.tryLater()) {
    console.info(moment.format('%DD %HH:%MM'));
}