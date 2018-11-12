"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Get ticket based on ticket id.
 *
 * @param {object} msg
 * @param {object} msg.body.ticket - ticket
 * @param {string} msg.body.ticket.TicketID
 * @param {object|object[]} [msg.body.ticket.Article]
 * @param {object} cfg - credentials + action configuration
 * @returns {Promise}
 */
async function processAction(msg, cfg) {
    const otrs = new OtrsConnector(cfg);
    const ticket = msg.body.ticket;
    const ticketId = msg.body.ticket.TicketID;

    if(!ticketId) {
        throw new Error('Ticket ID is required');
    }

    let ticketWithAtt = await otrs.getTicket(ticketId, {AllArticles: 1, Attachments: 1});

    ticket.Article = [].concat(ticket.Article);
    let attachmentsByArticleId = {};
    ticketWithAtt.Article.forEach(a => attachmentsByArticleId[a.ArticleID] = a.Attachment);
    ticket.Article.forEach(a => a.Attachment = attachmentsByArticleId[a.ArticleID]);

    await otrs.processAttachments(ticket);

    return ticket;
}
