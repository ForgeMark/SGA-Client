var stargate = {
  
  CHAPAHAI_OPEN: false,
  
  isOpen: function() {
    return this.CHAPAHAI_OPEN;
  },
  
  getChevronsOpened: function() {
    return document.querySelectorAll('.arrow:not(.on)').length;
  },
  
  enableChevron: function(n = -1) {
    var arrowsOff = document.querySelectorAll('.arrow:not(.on)');
    if (n == -1)
      var n = Math.floor(Math.random() * arrowsOff.length);
    try {
      arrowsOff[n].classList.add('on');
    } catch (error) {
      
    }
    
  },
  
  disableChevrons: function() {
    [].forEach.call(document.querySelectorAll('.arrow'), function(i) {
      i.classList.remove('on');
    });
  },
  
  enableWormHole: function() {
    this.CHAPAHAI_OPEN = true;
    document.querySelector('.wormhole').classList.add('on');
  },
  
  disableWormHole: function() {
    this.CHAPAHAI_OPEN = false;
    document.querySelector('.wormhole').classList.remove('on');    
    this.disableChevrons();
  },

  disableGate: function() {
    this.disableWormHole;
    document.querySelector(".sg-border").style = "filter: saturate(0);";
    [].forEach.call(document.querySelectorAll('#stargate img.chevron'), function(i) {
      i.style = "filter: invert(0);";
    });
  },

  enableGate: function() {
    this.disableWormHole;
    document.querySelector(".sg-border").style = "filter: saturate(1);";
    [].forEach.call(document.querySelectorAll('#stargate img.chevron'), function(i) {
      i.style = "filter: invert(1);";
    });
  }
}