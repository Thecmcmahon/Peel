// $(document).foundation(){

$(function() {

  $(window).scroll(function() {

    var mass = Math.max(250, 1900-1*$(this).scrollTop());

    $('#vari').css({'font-variation-settings': '"wght"' + mass});
    

  });
});


$(function() {

  $(window).scroll(function() {

    var mass = Math.max(250, 2800-1*$(this).scrollTop());

    $('#vari2').css({'font-variation-settings': '"wght"' + mass});
    

  });
});

$(function() {

  $(window).scroll(function() {

    var mass = Math.max(250, 3500-1*$(this).scrollTop());

    $('#vari3').css({'font-variation-settings': '"wght"' + mass});
    

  });
});