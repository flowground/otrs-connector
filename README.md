# OTRS-connector

OTRS connector for the [elastic.io platform](http://www.elastic.io "elastic.io platform")

> OTRS is a service management suite that comprises ticketing, workflow automation and notification, 
along with a wide range of customizable features. It is used by IT service management, 
customer service and corporate security help desks to better structure their communication and tasks.

## OTRS webservice setup
Before you can use the OTRS connector you need to create a OTRS Web Service and create endpoints for it
by completing the following steps:
1. On your OTRS instance go to the Admin page, by selecting the tab located on the top tabstrip.
2. On your admin tab under "Processes and Automation" select "Web Services"
3. On the Web Services Management page select Add Web Service, located on the left of the page
4. Give the web service a name "General → Name"
5. On the add new web service page under "OTRS as provider → Settings → Network transport" select
HTTP::REST 
6. Save the web service by clicking the save button on the bottom of the page
7. Create api endpoints "OTRS as provider → Operations → Add Operation"
8. Select the following four operations:
    1. Ticket::TicketCreate
    2. Ticket::TicketGet
    3. Ticket::TicketSearch
    4. Ticket::TicketUpdate
9. Once selecting any of these operations you must name the operation, we recommend naming them: ticket-create, ticket-get, ticket-search and ticket-update; after naming them click "Save" and then "Save and finish"
10. After creating all the operations go to "OTRS as provider → Operations → Configure" located on the right of the previously used "Network Transport"
11. Create Route mapping and set the valid request methods for each operation as follows:
    Operation | Route | Request Method
    --------- | ----- | --------------
    ticket-create | /Ticket | POST
    ticket-get | /Tickets/:TicketID | GET
    ticket-search | /Tickets | POST
    ticket-update | /Tickets/:TicketID | PATCH
12. On the same page configure "Maximum message length", give it a large number, minimum would be 1000
13. "Save and finish" the configuration
14. "Save and finish" the webservice

## Setting up credentials
Upon completing the web service setup it's time to configure the OTRS connector
1. On the sidebar on the left got to "Organize → Credentials"
2. Select "+ Add New Credential" located on the right of the page
3. Give your credentials a name
4. Construct the web service url by using the https protocol "https://", the domain of the OTRS instance "otrs-instance.managed-otrs.com" add "/otrs" add "/nph-genericinterface.pl/Webservice" and finally add the name of your webservice "/webservice-name"
  so the final url "https://example.managed-otrs.com/otrs//nph-genericinterface.pl/Webservice/MyWebService"
5. Add your username and password
6. In case you are using custom CA certificates add them in base64

## Using the connector
### actions: 
* addArticle → Updates an OTRS ticket by creating a article.
 (see https://doc.otrs.com/doc/api/otrs/5.0/Perl/Kernel/System/Ticket/Article.pm.html)     
* createTicket → Create a new OTRS Ticket.
 (see http://doc.otrs.com/doc/api/otrs/5.0/Perl/Kernel/GenericInterface/Operation/Ticket/TicketCreate.pm.html)
* getTicket → Get ticket based on it's id.
(see http://doc.otrs.com/doc/api/otrs/5.0/Perl/Kernel/GenericInterface/Operation/Ticket/TicketGet.pm.html)
* updateTicket → Updates an OTRS ticket by sending a request to the OTRS Web Service API.
(see http://doc.otrs.com/doc/api/otrs/5.0/Perl/Kernel/GenericInterface/Operation/Ticket/TicketUpdate.pm.html)
* processAttachments → Loads ticket attachments from OTRS and uploads them to the elastic.io platform.

_Most actions contain a input field called "Other" which will allow a user to add any other field to the input by creating a object. In this object the field is the object key and the value is the field value._
  
### triggers:
* getNewTickets → Get all new tickets, based on a given start date.
* getUpdateTickets → Get all tickets that have been updated after a given date.

_**For more information about the triggers and actions usage check the file index.html in readme-usage folder**_