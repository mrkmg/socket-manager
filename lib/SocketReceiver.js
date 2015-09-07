'strict';

var extend = require('extend'),
    async = require('async');

module.exports = function ()
{
    return new SocketReceiver();
}

function SocketReceiver()
{
    var self = this;

    self.next_handler_id = 0;

    self.actions = {};
    self.sockets = [];
    self.wants = {};
}

SocketReceiver.prototype.registerSocket = function (socket)
{
    var self = this;

    self.sockets.push(socket);

    socket.on('disconnect', function ()
    {
        var position = self.sockets.indexOf(socket);

        if (position !== -1)
        {
            self.sockets.splice(position, 1);
        }
    });

    socket.on('*', function (data)
    {
        self.handle.call(self, data.name, this, data.args[0]);
    });
}

SocketReceiver.prototype.registerHandler = function (action, handler, options)
{
    var self = this;

    var o = extend({
        requireClientId: true,
        requireAuth: true,
        requiredData: []
    }, options);

    if (self.actions.hasOwnProperty(action))
    {
        throw new Error('Action already has a registered handler: ' + action);
    }

    self.actions[action] = {
        options: o,
        handler: handler
    };
}

SocketReceiver.prototype.handle = function (action, socket, data)
{
    var self = this;

    if (!self.actions.hasOwnProperty(action))
    {
        socket.emit('handlerError', {
            error: 404,
            message: "The handler was not found: " + action
        });

        return;
    }
    if (self.actions[action].options.requireClientId && socket.client_id == undefined)
    {
        socket.emit('handlerError', {
            error: 401,
            message: "This request will not be processed due to your missing client ID"
        });
        return;
    }

    if (self.actions[action].options.requireAuth && !socket.isAuthenticated())
    {
        socket.emit('handleError', {
            error: 401,
            message: "This request will not be processed due to you not being authorized"
        });
        return;
    }

    var t = self.actions[action].options.requiredData.length;

    for (var i = 0; i < t; i++)
    {
        if (!data.hasOwnProperty(self.actions[action].options.requiredData[i]))
        {
            socket.emit('handleError', {
                error: 400,
                message: 'This request will not be processed due to missing data'
            });
            return;
        }
    }

    try
    {
        self.actions[action].handler.call(socket, data);
    } catch (err)
    {
        socket.emit('handlerError', {
            error: 500,
            message: 'There was an error processing the last request: ' + err
        });
    }
}

function arrayUnique(array)
{
    var a = array.concat();
    for (var i = 0; i < a.length; ++i)
    {
        for (var j = i + 1; j < a.length; ++j)
        {
            if (a[i] === a[j])
            {
                a.splice(j--, 1);
            }
        }
    }

    return a;
};