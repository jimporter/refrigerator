function Server() {
  this._sockets = new Map();

  navigator.publishServer('Refrigerator').then((server) => {

    const clientURLMap = {
      '/js/network.js': '/js/network-client.js',
    };

    server.onfetch = (event) => {
      let url = event.request.url;
      if (url in clientURLMap)
        url = clientURLMap[url];

      // Remove the leading '/' from the URL so that this works ok when opened
      // as a local file.
      fetch(url.substr(1)).then((response) => {
        event.respondWith(response);
      });
    };

    let userId = 1;
    server.onwebsocket = (event) => {
      let socket = event.accept();
      socket.onopen = (event) => {
        var id = userId++;
        this._onmessage({type: 'userjoined'}, id);
        this._sockets.set(socket, id);
      };
      socket.onclose = (event) => {
        var id = this._sockets.get(socket);
        this._sockets.delete(socket);
        this._onmessage({type: 'userparted'}, id);
      };
      socket.onmessage = (event) => {
        console.log('incoming message', event.data);
        this._onmessage(
          JSON.parse(event.data), this._sockets.get(socket)
        );
      };
    };

    if (this.onopen)
      this.onopen(); // XXX: Pass an event.

  }).catch((e) => {
    console.log('failed to publish server', e);
  });
}

Server.prototype = {
  onopen: null,
  onuserjoined: null,
  onuserparted: null,
  onchat: null,

  _relay: function(data) {
    var string = JSON.stringify(data);
    for (let [socket, id] of this._sockets)
      socket.send(string);
  },

  _onmessage: function(data, userId) {
    data.userId = userId;

    let handler = 'on' + data.type;
    if (this[handler])
      this[handler](data);
    this._relay(data);
  },

  sendChat: function(message) {
    let data = {type: 'chat', userId: 0, value: message}
    if (this.onchat)
      this.onchat(data);
    this._relay(data);
  },
};


let conn = new Server();
