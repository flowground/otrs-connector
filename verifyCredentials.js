"use strict";
module.exports = verify;
const OtrsConnector = require('./lib/services/OtrsConnector');

/**
 * Executes the verification logic by sending search for an inexistent ticket
 * @param credentials object
 * @returns Promise
 */
function verify(credentials) {
	const {user, password, baseUrl} = credentials;

	const otrs = new OtrsConnector(baseUrl, user, password);

	return otrs.getTickets({
		"TicketNumber": "0"
	})
}