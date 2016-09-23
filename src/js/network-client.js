function Client() {
  Connection.call(this);

  this._socket = new WebSocket('ws://' + location.host);
  this._socket.onmessage = (event) => {
    return this._onmessage(JSON.parse(event.data));
  };
}

Client.prototype = Object.create(Connection.prototype);
Client.prototype.constructor = Client;

Client.prototype._sendMessage = function(data) {
  this._socket.send(JSON.stringify(data));
};

let conn = new Client();
