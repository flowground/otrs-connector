/**
 * flowground :- Telekom iPaaS / otrs-connector
 * Copyright © 2020, Deutsche Telekom AG
 * contact: https://flowground.net/en/support-and-contact
 *
 * All files of this connector are licensed under the Apache 2.0 License. For details
 * see the file LICENSE on the top-level directory.
 */

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
        'TicketNumber': '0'
    }).catch(err => {
        console.log('Verify Credentials error: %j', err);
        return Promise.reject(err);
    });
}