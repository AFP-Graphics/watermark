http://medialab.afp.com/solr/newsml/select?q=*:*&fq=product:multimedia&rows=1&wt=json

// DOM elements
var $source;
var $photographer;
var $save;
var $textColor;
var $logo;
var $crop;
var $logoColor;
var $imageLoader;
var $imageLink;
var $imageLinkButton;
var $canvas;
var canvas;
var $qualityQuestions;
var $copyrightHolder;
var $dragHelp;
var $filename;
var $fileinput;
var $customFilename;

// Constants
var IS_MOBILE = Modernizr.touch && Modernizr.mq('screen and max-width(700px)');
var MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

// state
var scaledImageHeight;
var scaledImageWidth;
var fixedWidth = 1000;
var previewScale = IS_MOBILE ? 0.32 : 0.64;
var dy = 0;
var dx = 0;
var logoDimensions = {
  'afp': {
    w: 160,
    h: 88
  }
};
var elementPadding = 20;
var paddingLogo = [1, 7];
var image;
var imageFilename = 'image';
var currentCrop = 'original';
var currentLogo = 'afp';
var currentLogoColor = 'blue';
var currentTextColor = 'white';
var currentCopyright = 'afp';
var originalCredit = 'Anne-Claire Huet / AFP';
var credit;
var shallowImage = false;


// JS objects
var ctx;
var img = new Image();
var logo = new Image();


var onDocumentLoad = function(e) {
  $source = $('#source');
  $photographer = $('#photographer');
  $canvas = $('#imageCanvas');
  canvas = $canvas[0];
  $imageLoader = $('#imageLoader');
  $imageLink = $('#imageLink');
  $imageLinkButton = $('#imageLinkButton');
  ctx = canvas.getContext('2d');
  $save = $('.save-btn');
  $textColor = $('input[name="textColor"]');
  $logo = $('input[name="logo"]');
  $crop = $('input[name="crop"]');
  $logoColor = $('input[name="logoColor"]');
  $qualityQuestions = $('.quality-question');
  $copyrightHolder = $('.copyright-holder');
  $dragHelp = $('.drag-help');
  $filename = $('.fileinput-filename');
  $fileinput = $('.fileinput');
  $customFilename = $('.custom-filename');

  img.onload = onImageLoad;
  logo.src = 'assets/logo-' + currentLogo + '-' + currentLogoColor + '.png';
  logo.onload = renderCanvas;

  $photographer.on('keyup', renderCanvas);
  $source.on('keyup', renderCanvas);
  $imageLoader.on('change', handleImage);
  $imageLinkButton.on('click', handleImageLink);
  $save.on('click', onSaveClick);
  $textColor.on('change', onTextColorChange);
  $logo.on('change', onLogoChange);
  $logoColor.on('change', onLogoColorChange);
  $crop.on('change', onCropChange);
  $canvas.on('mousedown touchstart', onDrag);
  $copyrightHolder.on('change', onCopyrightChange);
  $customFilename.on('click', function(e) {
    e.stopPropagation();
  })

  $("body").on("contextmenu", "canvas", function(e) {
    return false;
  });

  $imageLink.keypress(function(e) {
    if (e.keyCode == 13) {
      handleImageLink();
    }
  });

  // $imageLink.on('paste', handleImageLink);

  renderCanvas();

  $(window).resize(function() {
    renderCanvas();
  });
}

/*
 * Draw the image, then the logo, then the text
 */
var renderCanvas = function() {
  // canvas is always the same width
  canvas.width = fixedWidth;

  // if we're cropping, use the aspect ratio for the height
  if (currentCrop == 'twitter') {
    canvas.height = fixedWidth / (16 / 9);
  }
  // if (currentCrop == 'twitter') {
  //   canvas.height = fixedWidth / (2 / 1);
  // }

  // clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // determine height of canvas and scaled image, then draw the image
  var imageAspect = img.width / img.height;
  var rescale = window.innerWidth <= 700 ? 0.32 : 0.64;

  if (currentCrop === 'original') {
    $('.canvas-cell').height(fixedWidth / imageAspect * rescale);
    canvas.height = fixedWidth / imageAspect;
    scaledImageHeight = canvas.height;
    ctx.drawImage(
      img,
      0,
      0,
      fixedWidth,
      scaledImageHeight
    );
  } else { //Image horizontale
    if (img.width / img.height > canvas.width / canvas.height) {
      shallowImage = true;

      scaledImageHeight = fixedWidth / imageAspect;
      scaledImageWidth = canvas.height * (img.width / img.height);
      $('.canvas-cell').height(scaledImageWidth / imageAspect * rescale+50);
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        dx,
        dy,
        scaledImageWidth,
        canvas.height
      );
    } else { //Image verticale
      shallowImage = false;

      scaledImageHeight = fixedWidth / imageAspect;
      $('.canvas-cell').height(canvas.height*rescale+50);
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        dx,
        dy,
        fixedWidth,
        scaledImageHeight
      );
    }
  }

  // set alpha channel, draw the logo
  if (currentLogoColor === 'white') {
    ctx.globalAlpha = "0.8";
  } else {
    ctx.globalAlpha = "1";
  }
  if (currentLogoColor == "blue") paddingLogo = [0, 0];
  ctx.drawImage(
    logo,
    paddingLogo[0],
    scaledImageHeight / 20 * 1,
    logoDimensions[currentLogo]['w'],
    logoDimensions[currentLogo]['h']
  );

  // reset alpha channel so text is not translucent
  ctx.globalAlpha = "1";

  // draw the text
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillStyle = currentTextColor;
  ctx.font = 'normal 16pt "Source Sans Pro"';

  if (currentTextColor === 'white') {
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
  }

  if (currentCopyright) {
    credit = buildCreditString();
  }

  var creditWidth = ctx.measureText(credit);
  ctx.fillText(
    credit,
    canvas.width - (creditWidth.width + elementPadding + 20),
    canvas.height - elementPadding - 10
  );
  validateForm();
}

/*
 * Build the proper format for the credit based on current copyright
 */
var buildCreditString = function() {
  var creditString;
  var val = $copyrightHolder.val();

  if (val === 'afp') {
    if ($photographer.val() == '') {
      // creditString = originalCredit;
    } else {
      creditString = $photographer.val() + ' / AFP';
    }
  }
  // else if (val === 'freelance') {
  //   creditString = $photographer.val() + ' for NPR';
  //   if ($photographer.val() !== '') {
  //     $photographer.parents('.form-group').removeClass('has-warning');
  //   } else {
  //     $photographer.parents('.form-group').addClass('has-warning');
  //   }
  // } else if (val === 'ap') {
  //   if ($photographer.val() !== '') {
  //     creditString = $photographer.val() + '/ AP';
  //   } else {
  //     creditString = 'AP';
  //   }
  // } else if (val === 'getty') {
  //   if ($photographer.val() !== '') {
  //     creditString = $photographer.val() + '/Getty Images';
  //   } else {
  //     creditString = 'Getty Images';
  //   }
  // }
  else {
    if ($photographer.val() !== '') {
      creditString = $photographer.val() + ' / ' + $source.val();
    } else {
      creditString = $source.val();
    }

    if ($source.val() !== '') {
      $source.parents('.form-group').removeClass('has-warning');
    } else {
      $source.parents('.form-group').addClass('has-warning');
    }
  }

  return creditString;
}


/*
 * Check to see if any required fields have not been
 * filled out before enabling saving
 */
var validateForm = function() {
  if ($('.has-warning').length === 0 && currentCopyright) {
    $save.removeAttr('disabled');
    $("body").off("contextmenu", "canvas");
  } else {
    $save.attr('disabled', '');
    $("body").on("contextmenu", "canvas", function(e) {
      return false;
    });
  }
}

/*
 * Handle dragging the image for crops when applicable
 */
var onDrag = function(e) {
  e.preventDefault();
  var originY = e.clientY || e.originalEvent.targetTouches[0].clientY;
  originY = originY / previewScale;

  var originX = e.clientX || e.originalEvent.targetTouches[0].clientX;
  originX = originX / previewScale;

  var startY = dy;
  var startX = dx;

  if (currentCrop === 'original') {
    return;
  }

  function update(e) {
    var dragY = e.clientY || e.originalEvent.targetTouches[0].clientY;
    dragY = dragY / previewScale;

    var dragX = e.clientX || e.originalEvent.targetTouches[0].clientX;
    dragX = dragX / previewScale;

    if (shallowImage === false) {
      if (Math.abs(dragY - originY) > 1) {
        dy = startY - (originY - dragY);

        // Prevent dragging image below upper bound
        if (dy > 0) {
          dy = 0;
          return;
        }

        // Prevent dragging image above lower bound
        if (dy < canvas.height - scaledImageHeight) {
          dy = canvas.height - scaledImageHeight;
          return;
        }

        renderCanvas();
      }
    } else {
      if (Math.abs(dragX - originX) > 1) {
        dx = startX - (originX - dragX);

        // Prevent dragging image below left bound
        if (dx > 0) {
          dx = 0;
          return;
        }

        // Prevent dragging image above right bound
        if (dx < canvas.width - scaledImageWidth) {
          dx = canvas.width - scaledImageWidth;
          return;
        }

        renderCanvas();
      }
    }


  }

  // Perform drag sequence:
  $(document).on('mousemove.drag touchmove', _.debounce(update, 5, true))
    .on('mouseup.drag touchend', function(e) {
      $(document).off('mouseup.drag touchmove mousemove.drag');
      update(e);
    });
}

/*
 * Take an image from file input and load it
 */
var handleImage = function(e) {
  if (e.target.value !== "") {
    var reader = new FileReader();
    reader.onload = function(e) {
      // reset dy value
      dy = 0;
      dx = 0;

      image = e.target.result;
      imageFilename = $('.fileinput-filename').text().split('.')[0];
      img.src = image;
      $customFilename.text(imageFilename);
      $customFilename.parents('.form-group').addClass('has-file');
      $imageLink.val('');
      $imageLink.parents('.form-group').removeClass('has-file');
    }
    reader.readAsDataURL(e.target.files[0]);
  }
}


/*
 * Load a remote  image
 */
var handleImageLink = function(e,url) {
  //var requestStatus =
  // Test if image URL returns a 200
  $.ajax({
    url: $imageLink.val(),
    success: function(data, status, xhr) {
      var responseType = xhr.getResponseHeader('content-type').toLowerCase();
      // if content type is jpeg, gif or png, load the image into the canvas
      if (MIME_TYPES.indexOf(responseType) >= 0) {
        // reset dy value
        dy = 0;
        dx = 0;

        $fileinput.fileinput('clear');
        $imageLink.parents('.form-group').addClass('has-file').removeClass(
          'has-error');
        $imageLink.parents('.input-group').next().text(
          'Click to edit name');

        img.src = $imageLink.val();
        img.crossOrigin = "anonymous"
          // firefox won't render image on first try without this  ¯\_(ツ)_/¯
        img.src = img.src;

        var filename = $imageLink.val().split('/');
        imageFilename = filename[filename.length - 1].split('.')[0];

        $imageLink.val(imageFilename);

        // otherwise, display an error
      } else {
        $imageLink.parents('.form-group').addClass('has-error');
        $imageLink.parents('.input-group').next().text(
          'Not a valid image URL');
        return;
      }
    },
    error: function(data) {
      $imageLink.parents('.form-group').addClass('has-error');
      $imageLink.parents('.input-group').next().text(
        'Not a valid image URL');
    }
  });
}

getImg();

function getImg() {
    $.getJSON("https://graphics.afp.com/data/medialab4w.json")
        .done(function(data) {
            getRand(data);
        })
        .fail(function() {
            console.log("error");
            img.src = 'assets/cooper.jpg';
            $photographer.val(originalCredit);
        });
}

function getRand(data) {
    var random = rand(0, data.response.docs.length - 1);
    var img = data.response.docs[random];
    var imgData = JSON.parse(img.bagItem);
    if (imgData[0].provider=="AFP") {
        var plusHauteRes = imgData[0].medias.length-1;
        var hiUrl = imgData[0].medias[plusHauteRes].href;
        $imageLink.val("http://medialab.afp.com"+hiUrl);
        handleImageLink();
        $photographer.val(imgData[0].creator);
    } else {
        getRand(data);
    }
}

function rand(num1, num2) {
    return Math.floor(Math.random() * num2) + 1 - num1;
}

/*
 * Set dragging status based on image aspect ratio and render canvas
 */
var onImageLoad = function(e) {
  renderCanvas();
  onCropChange();
}

/*
 * Load the logo based on radio buttons
 */
var loadLogo = function() {
  logo.src = 'assets/logo-' + currentLogo + '-' + currentLogoColor + '.png';
}

/*
 * Download the image on save click
 */
var onSaveClick = function(e) {
  e.preventDefault();

  /// create an "off-screen" anchor tag
  var link = document.createElement('a'),
    e;


  /// the key here is to set the download attribute of the a tag
  if ($customFilename.text()) {
    imageFilename = $customFilename.text();
  }

  if ($imageLink.val() !== "") {
    var filename = $imageLink.val().split('/');
    imageFilename = filename[filename.length - 1].split('.')[0];
  }

  link.download = 'afp-' + imageFilename + '.jpg';

  /// convert canvas content to data-uri for link. When download
  /// attribute is set the content pointed to by link will be
  /// pushed as "download" in HTML5 capable browsers

  link.href = canvas.toDataURL("image/jpeg",1); //Chrome crashes with large PNGs
  link.target = "_blank";

  /// create a "fake" click-event to trigger the download
  if (document.createEvent) {

    e = document.createEvent("MouseEvents");
    e.initMouseEvent("click", true, true, window,
      0, 0, 0, 0, 0, false, false, false,
      false, 0, null);

    link.dispatchEvent(e);

  } else if (link.fireEvent) {
    link.fireEvent("onclick");
  }
}

/*
 * Handle logo radio button clicks
 */
var onLogoColorChange = function(e) {
  currentLogoColor = $(this).val();

  loadLogo();
  renderCanvas();
}

/*
 * Handle text color radio button clicks
 */
var onTextColorChange = function(e) {
  currentTextColor = $(this).val();

  renderCanvas();
}

/*
 * Handle logo radio button clicks
 */
var onLogoChange = function(e) {
  currentLogo = $(this).val();

  loadLogo();
  renderCanvas();
}

/*
 * Handle crop radio button clicks
 */
var onCropChange = function() {
  currentCrop = $crop.filter(':checked').val();

  if (currentCrop !== 'original') {
    var dragClass = shallowImage ? 'is-draggable shallow' : 'is-draggable';
    $canvas.addClass(dragClass);
    $dragHelp.show();
  } else {
    $canvas.removeClass('is-draggable shallow');
    $dragHelp.hide();
  }

  renderCanvas();
}

/*
 * Show the appropriate fields based on the chosen copyright
 */
var onCopyrightChange = function() {
  currentCopyright = $copyrightHolder.val();
  $photographer.parents('.form-group').removeClass('has-warning');
  $source.parents('.form-group').removeClass('has-warning');

  if (currentCopyright === 'afp') {
    $photographer.parents('.form-group').removeClass('required').slideDown();
    $source.parents('.form-group').slideUp();
  }
  // else if (currentCopyright === 'freelance') {
  //   $photographer.parents('.form-group').slideDown();
  //   $source.parents('.form-group').slideUp();
  //   $photographer.parents('.form-group').addClass('has-warning required');
  // } else if (currentCopyright === 'ap' || currentCopyright === 'getty') {
  //   $photographer.parents('.form-group').removeClass('required').slideDown();
  //   $source.parents('.form-group')
  //     .slideUp()
  //     .removeClass('has-warning required');
  //
  // } else if (currentCopyright === 'third-party') {
  //   $photographer.parents('.form-group').removeClass('required').slideDown();
  //   $source.parents('.form-group').slideDown();
  //   $source.parents('.form-group').addClass('has-warning required');
  // }
  else {
    credit = '';
    $photographer.parents('.form-group').slideUp();
    $source.parents('.form-group')
      .slideUp()
      .parents('.form-group').removeClass('has-warning required');
  }

  renderCanvas();
}

$(onDocumentLoad);

/************
  Google Analytics
  ************/

(function(i, s, o, g, r, a, m) {
  i['GoogleAnalyticsObject'] = r;
  i[r] = i[r] || function() {
    (i[r].q = i[r].q || []).push(arguments)
  }, i[r].l = 1 * new Date();
  a = s.createElement(o),
    m = s.getElementsByTagName(o)[0];
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m)
})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-64253904-4', {
  'alwaysSendReferrer': true
});
ga('set', 'anonymizeIp', true);
ga('send', 'pageview');