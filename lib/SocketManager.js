
module.exports = function(){
    return new SocketManager();
}

module.exports.patchSocketIO = function (socketio)
{
    //Patch SocketIO to handle wildcard
    socketio.Manager.prototype.onClientMessage = function(id, packet)
    {
        if ( this.namespaces[ packet.endpoint ] ) {
            this.namespaces[ packet.endpoint ].handlePacket( id, packet );
            // BEGIN: Wildcard patch
            if (packet.type !== 'ack') {
                packet2 = JSON.parse( JSON.stringify( packet ) );
                packet2.name = '*';
                packet2.args = { name: packet.name, args: packet2.args, id: packet2.id };

                this.namespaces[ packet.endpoint ].handlePacket( id, packet2 );
            }
            // END: Wildcard patch
        }
    };
}

function SocketManager()
{
    var self = this;

    self.sender = require('./SocketSender')();
    self.receiver = require('./SocketReceiver')();

    self._isAuthenticatedCallback = function(){ return false; };

    self.receiver.registerHandler('subscribe', function(data)
    {
        if (this._wants.indexOf(data.event) == -1)
        {
            this._wants.push(data.event);
        }
    });

    self.receiver.registerHandler('unsubscribe', function(data)
    {
        var i = this._wants.indexOf(data.event);

        if (i !== -1)
        {
            this._wants.splice(i, 1);
        }
    });
}

SocketManager.prototype.registerSocket = function(socket)
{
    var self = this;

    socket._wants = [];
    socket.wants = function(action)
    {
        return this._wants.indexOf(action) !== -1;
    }

    socket.isAuthenticated = function()
    {
        return self._isAuthenticatedCallback.call(socket);
    }

    self.sender.registerSocket(socket);
    self.receiver.registerSocket(socket);
}

SocketManager.prototype.setAuthenticatedCallback = function(callback)
{
    var self = this;

    self._isAuthenticatedCallback = callback;
}

