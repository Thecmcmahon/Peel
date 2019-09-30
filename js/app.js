$(document).foundation()
// hide the overlay initially
$('.overlay').hide();

// create a button to close the overlay
// add it to the overlay
$('.overlay').append('<button>X</button>');

// open overlay
$('main img').click(function(){
  $('.overlay').show();
});

// close overlay
$('.overlay').click(function(){
  $('.overlay').hide();
});