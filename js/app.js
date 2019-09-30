$(document).foundation()
// hide the overlay initially
$('.overlay').hide();


// open overlay
$('main img').click(function(){
  $('.overlay').show();
});

// close overlay
$('.overlay').click(function(){
  $('.overlay').hide();
});