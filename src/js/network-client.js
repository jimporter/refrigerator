function Client() {
  this._socket = new WebSocket('ws://' + location.host);
  this._socket.onmessage = (event) => {
    return this._onmessage(JSON.parse(event.data));
  };
}

Client.prototype = {
  onconnected: null,
  onuserjoined: null,
  onuserparted: null,
  onchat: null,
  onnamechange: null,

  _onmessage: function(data) {
    let handler = 'on' + data.type;
    if (this[handler])
      this[handler](data);
  },

  sendChat: function(message) {
    this._socket.send(JSON.stringify({type: 'chat', value: message}));
  },

  sendDrawing: function(info) {
    this._socket.send(JSON.stringify({type: 'drawing', value: info}));
  },

  sendNameChange: function(name) {
    this._socket.send(JSON.stringify({type: 'namechange', value: name}));
  },
};

let conn = new Client();
