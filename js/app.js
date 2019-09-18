$(document).foundation();

$('nav a').click(function(event){
  
  // prevent defalt click behavior
  // don't jump to content
  event.preventDefault();

  // remove "selected" class from all links
  $('nav a').removeClass('selected');

  // add "selected" class to the link that was just selected
  $(this).addClass('selected');
    
  // identify position of target
  var target = $(this).attr('href');
  var top = $(target).offset().top;

  // animate scroll to the target
  $('html,body').animate({
    scrollTop: top
    },700);

});
