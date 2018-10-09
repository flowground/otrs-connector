"use strict";
module.exports = verify;
const OtrsConnector = require('./lib/services/OtrsConnector');

/**
 * Executes the verification logic by sending a simple to the Petstore API using the provided apiKey.
 * If the request succeeds, we can assume that the apiKey is valid. Otherwise it is not valid.
 *
 * @param credentials object
 *
 * @returns
 */
function verify(credentials) {
	const { user, password } = credentials;

	const otrs = new OtrsConnector('https://rrsg.managed-otrs.com/otrs/nph-genericinterface.pl/Webservice/ws1', {user , password});

	return otrs.getTickets({
		"TicketNumber": "0"
	}).then(
		() => console.log('success')
	).catch(
		() => console.log('err')
	);
}