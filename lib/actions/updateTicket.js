"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Updates an OTRS ticket by sending a request to the OTRS Web Service API.
 * The function returns a Promise.
 *
 * @param msg incoming messages which contains the ticket in the body property
 * @param cfg object that contains the baseUrl, the OTRS project and the user / password for authentication
 * @returns promise resolving a message to be emitted to the platform
 */
function processAction(msg, cfg) {

    const ticket = msg.body;

    const otrs = new OtrsConnector(cfg);

    return otrs.updateTicket(ticket.id, ticket);
}