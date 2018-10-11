"use strict";
const messages = require('elasticio-node').messages;
const OtrsConnector = require('../services/OtrsConnector');

exports.process = processAction;

/**
 * Executes the triggers's logic by sending a request to the OTRS Web Service API for the ticket ids,
 * and then executing a request to get the data for all the tickets.
 *
 * @param {object} msg - an empty object
 * @param {object} cfg - credentials + trigger configuration
 * @param {object} snp - last processed ticket id and the date that it was crated
 * @returns {Promise}
 */
async function processAction(msg, cfg, snp) {

    const {startDateTime} = cfg;

    if(!startDateTime) {
        throw new Error('You must specify a start date')
    }

    const otrs = new OtrsConnector(cfg);

    let {lastProcessedTicketId, lastProcessedTicketDate} = snp;

    lastProcessedTicketId = lastProcessedTicketId || 0;
    lastProcessedTicketDate = lastProcessedTicketId || startDateTime;

    let newTicketIds = [];

    await otrs.searchTickets({
        TicketCreateTimeNewerDate: lastProcessedTicketDate,
        SortBy: "Created",
        OrderBy: "Up"
    }).then(res => {
        newTicketIds = res.TicketID.filter(ticketId => Number(ticketId) > lastProcessedTicketId).sort((a, b) => a - b);
    }).catch(error => {
        this.emit('error', error);
    });

    return otrs.getTickets(newTicketIds).then(res => {
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
