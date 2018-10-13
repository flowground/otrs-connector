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

    if(!cfg.startDateTime) {
        throw new Error('You must specify a start date');
    }

    const otrs = new OtrsConnector(cfg);

    let lastUpdatedTicketId = snp.lastUpdatedTicketId || 0;
    let lastUpdatedTicketDate = snp.lastUpdatedTicketDate || cfg.startDateTime;

    let newTicketIds = await otrs.searchTickets({
        TicketChangeTimeNewerDate: lastUpdatedTicketDate,
        SortBy: "Changed",
        OrderBy: "Up"
    }).then(ids => {
        return (ids || []).filter(ticketId => Number(ticketId) > lastUpdatedTicketId).sort((a, b) => a - b);
    }).catch(error => {
        this.emit('error', error);
        throw new Error(error);
    });

    if(!newTicketIds.length) {
        return;
    }

    otrs.getTickets(newTicketIds).then(tickets => {
        tickets.forEach(ticket => {
            this.emit('data', messages.newMessageWithBody(ticket));
            this.emit('snapshot', {
                lastUpdatedTicketId: Number(ticket.TicketID),
                lastUpdatedTicketDate: ticket.Created
            });
        });
    }).catch(error => {
        this.emit('error', error);
    });
}
