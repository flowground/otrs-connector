"use strict";
const messages = require('elasticio-node').messages;
const OtrsConnector = require('../services/OtrsConnector');

exports.process = processAction;

/**
 * Executes the action's logic by sending a request to the OTRS Web Service API.
 * The function returns a Promise.
 *
 * @param msg incoming messages which contains the ticket in the body property
 * @param cfg object that contains the baseUrl, the OTRS project and the user / password for authentication
 * @returns promise resolving a message to be emitted to the platform
 */
function processAction(msg, cfg) {

    const ticket = msg.body;

    const otrs = new OtrsConnector(cfg);

    otrs.updateTicket(ticket.id, ticket).then(response => {
        this.emit('data', messages.newMessageWithBody(response));
    }).catch(error => {
        this.emit('error', error);
    }).finally(() => {
        this.emit('end')
    });
}