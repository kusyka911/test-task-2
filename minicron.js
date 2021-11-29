#!/usr/bin/env node

import { stdin, stdout } from "process";
import * as readline from "readline";

// polyfills
Array.prototype.contains = function (element) {
	return this.indexOf(element) !== -1;
};

// constants
const TIME_ARG_VALIDATE_REGEX =
	/^(\d|[01]\d|[2][0123]):(\d|[0-5]\d)|24:00$/;
const JOB_VALIDATE_REGEX = /^(\d|[012345]\d|\*) (\d|[01]\d|[2][0123]|\*) (.*)$/;

/**
 * @typedef Time
 * @prop {number} hours
 * @prop {number} minutes
 *
 * @typedef Job
 * @prop {string} hourOfDay
 * @prop {string} minuteOfHour
 * @prop {string} command
 */

// utility functions

/**
 * returns time parsed from arg or current time (if not correct arg provided).
 * @returns {Time} time
 */
const getSimulatedTime = () => {
	const input = process.argv[2];
	if (input) {
		if (!TIME_ARG_VALIDATE_REGEX.test(input)) {
			throw new Error("Invalid simulated time argument");
		}
		const [hours, minutes] = input.split(":");
		return {
			hours: parseInt(hours),
			minutes: parseInt(minutes),
		};
	}

	const now = new Date();
	return {
		hours: now.getHours(),
		minutes: now.getMinutes(),
	};
};

/**
 * @param {string} str
 * @returns {Job} job
 */
const parseJob = (str) => {
	if (!JOB_VALIDATE_REGEX.test(str)) {
		throw new Error("Invalid input");
	}

	const [minutes, hours, ...command] = str.trim().split(/\s+/);

	return {
		hourOfDay: hours,
		minuteOfHour: minutes,
		command: command.join(" "),
	};
};

/**
 * @param {number} int
 */
const formatTimeNumber = (int) =>
	int.toLocaleString(undefined, {
		maximumFractionDigits: 0,
		minimumIntegerDigits: 2,
	});

/**
 *
 * @param {Date} time
 * @returns {string}
 */
const formatTimeFromDate = (date) => {
	return `${formatTimeNumber(date.getHours())}:${formatTimeNumber(
		date.getMinutes(),
	)}`;
};

// Next run calculation functions
const _findNextRunForHourlyJob = (now, job) => {
	const minuteOfHour = parseInt(job.minuteOfHour);
	return {
		...now,
		minutes: minuteOfHour < now.minutes ? 59 + minuteOfHour : minuteOfHour,
	};
};

const _findNextRunForMinutelyJob = (now, job) => {
	const hourOfDay = parseInt(job.hourOfDay);
	if (hourOfDay < now.hours) {
		return {
			hours: 23 + hourOfDay,
			minutes: 0,
		};
	} else {
		return {
			hours: hourOfDay,
			minutes: hourOfDay === now.hours ? now.minutes : 0,
		};
	}
};

/**
 * @param {Time} now
 * @param {Job} job
 * @returns {Time}
 */
const findNextRun = (now, job) => {
	const isEachHourRun = job.hourOfDay === "*";
	const isEachMinuteRun = job.minuteOfHour === "*";

	if (isEachHourRun && isEachMinuteRun) {
		return { ...now };
	}

	// handle hourly job;
	if (isEachHourRun) {
		return _findNextRunForHourlyJob(now, job);
	}

	// every minute during defined hour
	if (isEachMinuteRun) {
		return _findNextRunForMinutelyJob(now, job);
	}

	// find next run for daily job
	const minuteOfHour = parseInt(job.minuteOfHour);
	const hourOfDay = parseInt(job.hourOfDay);

	return {
		hours: hourOfDay < now.hours ? hourOfDay + 24 : hourOfDay,
		minutes: minuteOfHour,
	};
};

/**
 * @param {Time} time
 * @param {string} jobStr
 * @returns
 */
const processJobString = (time, jobStr) => {
	const job = parseJob(jobStr);
	const nextRun = findNextRun(time, job);

	const date = new Date();
	const currentDay = date.getDate();
	date.setHours(nextRun.hours, nextRun.minutes);

	const isNextRunTomorrow = currentDay !== date.getDate();
	return `${formatTimeFromDate(date)} ${
		isNextRunTomorrow ? "tomorrow" : "today"
	} ${job.command}`;
};

// entry point
const main = () => {
	/** @type {Time} */
	let simulatedTime;
	try {
		simulatedTime = getSimulatedTime();
	} catch (error) {
		console.error(error);
		process.exit(-1);
	}

	const rl = readline.createInterface(stdin);
	rl.on("line", (input) => {
		try {
			const output = processJobString(simulatedTime, input);
			stdout.write(`${output}\n`);
		} catch (error) {
			console.error(error);
			process.exit(-1);
		}
	});
};

// handle help arg
if (process.argv.contains("--help") || process.argv.contains("-h")) {
	console.log(`Usage: cat input.txt | node minicron.js [time]`);
	console.log(`* time must be in 24h format (16:10)`);
	process.exit(0);
}

// exit in case no input stream attached.
if (stdin.isTTY) {
	console.error("Input stream not attached");
	process.exit(-1);
}

// start program
main();
