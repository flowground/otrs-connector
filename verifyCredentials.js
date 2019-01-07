"use strict";
module.exports = verify;
const OtrsConnector = require('./lib/services/OtrsConnector');

/**
 * Executes the verification logic by sending search for an inexistent ticket
 * @param credentials object
 * @returns Promise
 */
function verify(credentials) {

    const otrs = new OtrsConnector(credentials);

    return otrs.searchTickets({
        "TicketNumber": "0"
    }).catch(err => {
        console.log('Verify Credentials error:', JSON.stringify(err));
        return Promise.reject(err);
    });
}