"use strict";
const messages = require('elasticio-node').messages;
const OtrsConnector = require('../services/OtrsConnector');

exports.process = processAction;

/**
 * Executes the triggers's logic by sending a request to the OTRS Web Service API for the ticket ids,
 * and then executing a request to get the data for all the tickets.
 *
 * @param msg - an empty object
 * @param cfg - object that contains the baseUrl, the OTRS project and the user / password for authentication
 *        and the startDateTime
 * @param snp - object that contains lastProcessedTicketId and lastProcessedTicketDate
 * @returns promise resolving a message to be emitted to the platform
 */
async function processAction(msg, cfg, snp) {

    const {baseUrl, user, password, startDateTime} = cfg;

    if(!baseUrl) {
        throw new Error('You must specify a host');
    }

    if(!user) {
        throw new Error('You must specify a user');
    }

    if(!password) {
        throw new Error('You must specify a password for the user');
    }

    if(!startDateTime) {
        throw new Error('You must specify a start date')
    }

    const otrs = new OtrsConnector(baseUrl, user, password);

    let {lastProcessedTicketId, lastProcessedTicketDate} = snp;

    lastProcessedTicketId = lastProcessedTicketId || 0;
    lastProcessedTicketDate = lastProcessedTicketId || startDateTime;

    let newTicketsIds = [];

    await otrs.searchTickets({
        TicketCreateTimeNewerDate: lastProcessedTicketDate,
        SortBy: "Created",
        OrderBy: "Up"
    }).then(res => {
        newTicketsIds = res.TicketID.filter(ticketId => Number(ticketId) > lastProcessedTicketId).sort((a, b) => a - b);
    }).catch(error => {
        this.emit('error', error);
    });

    return otrs.getTickets(newTicketsIds).then(res => {
        const tickets = res.Ticket;

        tickets.forEach(ticket => {
            const { Created, TicketID } = ticket;

            this.emit('data', messages.newMessageWithBody(ticket));
            this.emit('snapshot', {
                lastProcessedTicketId: Number(TicketID),
                lastProcessedTicketDate: Created
            });
        });
    }).catch(error => {
        this.emit('error', error);
    });
}
