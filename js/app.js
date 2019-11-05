// $(document).foundation(){

$(function() {

  $(window).scroll(function() {

    var mass = Math.max(250, 1500-1*$(this).scrollTop());

    $('#vari').css({'font-variation-settings': '"wght"' + mass});
    

  });
});


$(function() {

  $(window).scroll(function() {

    var mass = Math.max(250, 2400-1*$(this).scrollTop());

    $('#vari2').css({'font-variation-settings': '"wght"' + mass});
    

  });
});

$(function() {

  $(window).scroll(function() {

    var mass = Math.max(250, 3200-1*$(this).scrollTop());

    $('#vari3').css({'font-variation-settings': '"wght"' + mass});
    

  });
});