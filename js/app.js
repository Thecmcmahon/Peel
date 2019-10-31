// $(document).foundation(){

$(function() {

  $(window).scroll(function() {

    var mass = Math.max(250, 1500-1*$(this).scrollTop());

    $('#vari').css({'font-variation-settings': '"wght"' + mass});
    

  });
});


