var async = require('async');

module.exports = function()
{
    return new SocketSender();
}

function SocketSender()
{
    var self = this;

    self.sockets = [];
}

SocketSender.prototype.registerSocket = function(socket)
{
    var self = this;

    self.sockets.push(socket);

    socket.on('disconnect', function(){
        var position = self.sockets.indexOf(socket);

        if (position !== -1)
        {
            self.sockets.splice(position, 1);
        }
    });

    socket.reply = function(event, data)
    {
        self.emit(this, event, data);
    }
}

SocketSender.prototype.emit = function(socket, event, data)
{
    var self = this;

    //Basic check to ensure socket is still valid
    if (self.sockets.indexOf(socket) !== 1)
    {
        socket.emit(event, data);
    }
}

SocketSender.prototype.broadcastCustom = function(filter, event, data, subscription, require_auth)
{
    var self = this;

    if (typeof require_auth == 'undefined')
    {
        require_auth = true
    }

    if (typeof subscription == 'undefined')
    {
        subscription = '';
    }

    if (typeof data == 'undefined')
    {
        data = {};
    }

    async.each(self.sockets, function(socket, callback)
    {
        if (!filter(socket))
        {
            return callback();
        }

        if (require_auth && !socket.isAuthenticated())
        {
            return callback(); //Does not have required authentication
        }

        if (subscription !== '' && !socket.wants(subscription))
        {
            return callback(); //Does not want this event
        }

        socket.emit(event, data);
        callback();
    });
}

SocketSender.prototype.broadcast = function(event, data, subscription, require_auth)
{
    var self = this;

    if (typeof require_auth == 'undefined')
    {
        require_auth = true
    }

    if (typeof subscription == 'undefined')
    {
        subscription = false;
    }

    if (typeof data == 'undefined')
    {
        data = {};
    }

    async.each(self.sockets, function(socket, callback)
    {
        if (require_auth && !socket.isAuthenticated())
        {
            return callback(); //Does not have required authentication
        }

        if (subscription && !socket.wants(subscription))
        {
            return callback(); //Does not want this event
        }

        socket.emit(event, data);
        callback();
    });
}