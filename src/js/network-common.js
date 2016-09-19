function Connection() {}

Connection.prototype = {
  onconnected: null,
  onuserjoined: null,
  onuserparted: null,
  onchat: null,
  onnamechange: null,
  ondrawing: null,
  onclear: null,
  onerror: null,

  _sendMessage: null,

  _onmessage: function(data) {
    let handler = 'on' + data.type;
    if (this[handler])
      this[handler](data);
  },

  sendChat: function(message) {
    this._sendMessage({type: 'chat', value: message});
  },

  sendDrawing: function(info) {
    this._sendMessage({type: 'drawing', value: info});
  },

  sendClear: function(info) {
    this._sendMessage({type: 'clear'});
  },

  sendNameChange: function(name) {
    this._sendMessage({type: 'namechange', value: name});
  },
};
