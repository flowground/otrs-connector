/**
 * flowground :- Telekom iPaaS / otrs-connector
 * Copyright © 2020, Deutsche Telekom AG
 * contact: https://flowground.net/en/support-and-contact
 *
 * All files of this connector are licensed under the Apache 2.0 License. For details
 * see the file LICENSE on the top-level directory.
 */

"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Create a new OTRS Ticket.
 *
 * @alias createTicket
 * @param {object} msg - contains the data for the new ticket
 * @param {object} msg.body - data for new ticket
 * @param {object} cfg - credentials
 * @param {string} cfg.baseUrl
 * @param {string} cfg.username
 * @param {string} cfg.password
 *
 * @returns {Promise} - new OTRS ticket
 */
function processAction(msg, cfg) {
    const ticket = msg.body;

    const otrs = new OtrsConnector(cfg);

    return otrs.createTicket(ticket);
}