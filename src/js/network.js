function fetchAndRespond(url, event) {
  // XXX: Ideally, we should be able to just pass the result of the `fetch()`
  // call directly to `respondWith()`. However, this will not work if the page
  // hosting the FlyWeb server is on a host using HTTP compression (e.g. GitHub
  // Pages). Once HTTP compression is supported, this can all be reduced to a
  // single line of code:
  //
  // evt.respondWith(fetch(url));

  var contentType;
  return fetch(url).then((response) => {
    contentType = response.headers.get('Content-Type');
    return response.blob();
  }).then((blob) => {
    event.respondWith(new Response(blob, {
      headers: {'Content-Type': contentType}
    }));
  });
}

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
      fetchAndRespond(url.substr(1), event);
    };

    let userId = 1;
    server.onwebsocket = (event) => {
      let socket = event.accept();
      socket.onopen = (event) => {
        var id = userId++;
        this._onmessage({type: 'userjoined'}, id);
        this._sockets.set(socket, id);
        socket.send(JSON.stringify({
          type: 'connected', userId: id,
          // XXX: Don't refer to the UI here; it's messy.
          image: document.getElementById('canvas').toDataURL()
        }));
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

    if (this.onconnected)
      this.onconnected({type: 'connected', userId: 0});

  }).catch((e) => {
    console.log('failed to publish server', e);
  });
}

Server.prototype = {
  onconnected: null,
  onuserjoined: null,
  onuserparted: null,
  onchat: null,

  _relay: function(data) {
    var string = JSON.stringify(data);
    for (let [socket, id] of this._sockets)
      socket.send(string);
  },

  // Handle an incoming message, route it to the right event handler, and relay
  // it to the clients.
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

  sendDrawing: function(info) {
    let data = {type: 'drawing', userId: 0, value: info}
    if (this.ondrawing)
      this.ondrawing(data);
    this._relay(data);
  },
};

let conn = new Server();
