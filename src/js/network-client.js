function Client() {
  this._socket = new WebSocket('ws://' + location.host);
  this._socket.onmessage = (event) => {
    return this._onmessage(JSON.parse(event.data));
  };
}

Client.prototype = {
  onuserjoined: null,
  onuserparted: null,
  onchat: null,

  get onopen() {
    return this._socket.onopen;
  },

  set onopen(val) {
    return this._socket.onopen = val;
  },

  _onmessage: function(data) {
    let handler = 'on' + data.type;
    if (this[handler])
      this[handler](data);
  },

  sendChat: function(message) {
    this._socket.send(JSON.stringify({type: 'chat', value: message}));
  },
};

let conn = new Client();
