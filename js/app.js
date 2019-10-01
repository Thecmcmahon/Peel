$(document).foundation()
// hide the overlay initially
$('.overlay').hide();


// open overlay
$('main img').click(function(){
  $('.overlay').show();
  $( "div" ).addClass( "blur" );
});

// close overlay
$('.overlay').click(function(){
  $('.overlay').hide();
  $( "div" ).removeClass( "blur" );
});