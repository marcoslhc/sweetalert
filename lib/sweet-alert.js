// SweetAlert
// 2014 (c) - Tristan Edwards
// github.com/t4t5/sweetalert
(function (window, document) {
'use strict';
  var getModal, getOverlay, hasClass, addClass, removeClass, escapeHtml, _show, show,
      _hide, hide, isDescendant, getTopMargin, fadeIn, fadeOut, fireClick, stopEventPropagation,
      previousActiveElement, previousDocumentClick, previousWindowKeyDown, lastFocusedButton,
      modalClass   = '.sweet-alert',
      overlayClass = '.sweet-overlay',
      alertTypes   = ['error', 'warning', 'info', 'success'];

  /*
   * Manipulate DOM
   */

    getModal = function () {
      return document.querySelector(modalClass);
    };
    getOverlay = function () {
      return document.querySelector(overlayClass);
    };
    hasClass = function (elem, className) {
      return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
    };
    addClass = function (elem, className) {
      if (!hasClass(elem, className)) {
        elem.className += ' ' + className;
      }
    };
    removeClass = function (elem, className) {
      var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
      if (hasClass(elem, className)) {
        while (newClass.indexOf(' ' + className + ' ') >= 0) {
          newClass = newClass.replace(' ' + className + ' ', ' ');
        }
        elem.className = newClass.replace(/^\s+|\s+$/g, '');
      }
    };
    escapeHtml = function (str) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
    };
    _show = function (elem) {
      elem.style.opacity = '';
      elem.style.display = 'block';
    };
    show = function (elems) {
      if (elems && !elems.length) {
        return _show(elems);
      }
      for (var i = 0; i < elems.length; ++i) {
        _show(elems[i]);
      }
    };
    _hide = function (elem) {
      elem.style.opacity = '';
      elem.style.display = 'none';
    };
    hide = function (elems) {
      if (elems && !elems.length) {
        return _hide(elems);
      }
      for (var i = 0; i < elems.length; ++i) {
        _hide(elems[i]);
      }
    };
    isDescendant = function (parent, child) {
      var node = child.parentNode;
      while (node !== null) {
        if (node === parent) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    };
    getTopMargin = function (elem) {
      elem.style.left = '-9999px';
      elem.style.display = 'block';

      var height = elem.clientHeight,
          padding = parseInt(getComputedStyle(elem).getPropertyValue('padding'), 10);

      elem.style.left = '';
      elem.style.display = 'none';
      return ('-' + parseInt(height / 2 + padding) + 'px');
    };
    fadeIn = function (elem, interval) {
      var tick, last;
      if (+elem.style.opacity < 1) {
        interval = interval || 16;
        elem.style.opacity = 0;
        elem.style.display = 'block';
        last = +new Date();
        tick = function () {
          elem.style.opacity = +elem.style.opacity + (new Date() - last) / 100;
          last = +new Date();

          if (+elem.style.opacity < 1) {
            setTimeout(tick, interval);
          }
        };
        tick();
      }
    };
    fadeOut = function (elem, interval) {
      var tick, last;
      interval = interval || 16;
      elem.style.opacity = 1;
      last  = +new Date();
      tick = function () {
        elem.style.opacity = +elem.style.opacity - (new Date() - last) / 100;
        last = +new Date();

        if (+elem.style.opacity > 0) {
          setTimeout(tick, interval);
        } else {
          elem.style.display = 'none';
        }
      };
      tick();
    };
    fireClick = function (node) {
      var evt, mevt;
      // Taken from http://www.nonobtrusive.com/2011/11/29/programatically-fire-crossbrowser-click-event-with-javascript/
      // Then fixed for today's Chrome browser.
      if (MouseEvent) {
        // Up-to-date approach
        mevt = new MouseEvent('click', {
          view: window,
          bubbles: false,
          cancelable: true
        });
        node.dispatchEvent(mevt);
      } else if ( document.createEvent ) {
        // Fallback
        evt = document.createEvent('MouseEvents');
        evt.initEvent('click', false, false);
        node.dispatchEvent(evt);
      } else if ( document.createEventObject ) {
        node.fireEvent('onclick') ;
      } else if (typeof node.onclick === 'function' ) {
        node.onclick();
      }
    };
    stopEventPropagation = function (e) {
      // In particular, make sure the space bar doesn't scroll the main window.
      if (typeof e.stopPropagation === 'function') {
        e.stopPropagation();
        e.preventDefault();
      } else if (window.event && window.event.hasOwnProperty('cancelBubble')) {
        window.event.cancelBubble = true;
      }
    };

  // Remember state in cases where opening and handling a modal will fiddle with it.

  /*
   * Add modal + overlay to DOM
   */

  function initialize() {
    var sweetHTML = '',
        sweetWrap = document.createElement('div');

    sweetHTML += '<div class="sweet-overlay" tabIndex="-1"></div>';
    sweetHTML += '<div class="sweet-alert" tabIndex="-1"><div class="icon error">';
    sweetHTML += '<span class="x-mark"><span class="line left"></span>';
    sweetHTML += '<span class="line right"></span></span></div><div class="icon warning">';
    sweetHTML += '<span class="body"></span><span class="dot"></span></div>';
    sweetHTML += '<div class="icon info"></div><div class="icon success">';
    sweetHTML += '<span class="line tip"></span><span class="line long"></span>';
    sweetHTML += '<div class="placeholder"></div><div class="fix"></div></div>';
    sweetHTML += '<div class="icon custom"></div><h2>Title</h2><p>Text</p>';
    sweetHTML += '<div class="content"></div><button class="cancel" tabIndex="2">Cancel</button>';
    sweetHTML += '<button class="confirm" tabIndex="1">OK</button></div>';

    sweetWrap.classList.add('sweet-container');
    sweetWrap.innerHTML = sweetHTML;

    // For readability: check sweet-alert.html
    document.body.appendChild(sweetWrap);

    // For development use only!
    /*jQuery.ajax({
        url: '../lib/sweet-alert.html', // Change path depending on file location
        dataType: 'html'
      })
      .done(function (html) {
        jQuery('body').append(html);
      });*/
  }

  /*
   * Global sweetAlert function
   */

  window.sweetAlert = window.swal = function () {

    // Default parameters
    var i, modal, onButtonEvent, $buttons, $confirmButton, $cancelButton, functionAsStr,
      functionHandlesCancel, $okButton, $modalButtons,
      params = {
      title: '',
      text: '',
      type: null,
      allowOutsideClick: false,
      showCancelButton: false,
      closeOnConfirm: true,
      closeOnCancel: true,
      confirmButtonText: 'OK',
      confirmButtonColor: '#AEDEF4',
      cancelButtonText: 'Cancel',
      imageUrl: null,
      imageSize: null,
      sourceUrl: ''
    };

    if (arguments[0] === undefined) {
      window.console.error('sweetAlert expects at least 1 attribute!');
      return false;
    }

    switch (typeof arguments[0]) {

      case 'string':
        params.title = arguments[0];
        params.text  = arguments[1] || '';
        params.type  = arguments[2] || '';

        break;

      case 'object':
        if (arguments[0].title === undefined) {
          window.console.error('Missing "title" argument!');
          return false;
        }

        params.title              = arguments[0].title;
        params.text               = arguments[0].text || params.text;
        params.type               = arguments[0].type || params.type;
        params.allowOutsideClick  = arguments[0].allowOutsideClick || params.allowOutsideClick;
        params.showCancelButton   = arguments[0].showCancelButton !== undefined ?
            arguments[0].showCancelButton : params.showCancelButton;
        params.closeOnConfirm     = arguments[0].closeOnConfirm !== undefined ?
            arguments[0].closeOnConfirm : params.closeOnConfirm;
        params.closeOnCancel      = arguments[0].closeOnCancel !== undefined ?
            arguments[0].closeOnCancel : params.closeOnCancel;

        // Show "Confirm" instead of "OK" if cancel button is visible
        params.confirmButtonText  = (params.showCancelButton) ?
            'Confirm' : params.confirmButtonText;

        params.confirmButtonText  = arguments[0].confirmButtonText || params.confirmButtonText;
        params.confirmButtonColor = arguments[0].confirmButtonColor || params.confirmButtonColor;
        params.cancelButtonText   = arguments[0].cancelButtonText || params.cancelButtonText;
        params.imageUrl           = arguments[0].imageUrl || params.imageUrl;
        params.imageSize          = arguments[0].imageSize || params.imageSize;

        params.sourceUrl          = arguments[0].sourceUrl || params.sourceUrl;
        params.html               = arguments[0].html || params.html;
        params.contentStyle       = arguments[0].contentStyle || params.contentStyle;

        params.doneFunction       = arguments[1] || null;

        break;

      default:
        window.console.error(
            'Unexpected type of argument! Expected "string" or "object", got ' +
            typeof arguments[0]);
        return false;

    }

    setParameters(params);
    //fixVerticalPosition();
    openModal();
    // Modal interactions
    modal = getModal();

    // Mouse interactions
    onButtonEvent = function (e) {

      var target = e.target || e.srcElement, $contentDiv,
          targetedConfirm    = (target.className === 'confirm'),
          modalIsVisible     = hasClass(modal, 'visible'),
          doneFunctionExists = (params.doneFunction &&
            modal.getAttribute('data-has-done-function') === 'true');

      $contentDiv = modal.querySelectorAll('.content')[0];
      switch (e.type) {
        case ('mouseover'):
          if (targetedConfirm) {
            e.target.style.backgroundColor = colorLuminance(params.confirmButtonColor, -0.04);
          }
          break;
        case ('mouseout'):
          if (targetedConfirm) {
            e.target.style.backgroundColor = params.confirmButtonColor;
          }
          break;
        case ('mousedown'):
          if (targetedConfirm) {
            e.target.style.backgroundColor = colorLuminance(params.confirmButtonColor, -0.14);
          }
          break;
        case ('mouseup'):
          if (targetedConfirm) {
            e.target.style.backgroundColor = colorLuminance(params.confirmButtonColor, -0.04);
          }
          break;
        case ('focus'):
          $confirmButton = modal.querySelector('button.confirm');
          $cancelButton  = modal.querySelector('button.cancel');

          if (targetedConfirm) {
            $cancelButton.style.boxShadow = 'none';
          } else {
            $confirmButton.style.boxShadow = 'none';
          }
          break;
        case ('click'):
          if (targetedConfirm && doneFunctionExists && modalIsVisible) { // Clicked "confirm"

            params.doneFunction(true);

            if (params.closeOnConfirm) {
              closeModal();
            }
          } else if (doneFunctionExists && modalIsVisible) { // Clicked "cancel"

            // Check if callback function expects a parameter (to track cancel actions)
            functionAsStr          = String(params.doneFunction).replace(/\s/g, '');
            functionHandlesCancel  = functionAsStr.substring(0, 9) === 'function (' &&
                functionAsStr.substring(9, 10) !== ')';

            if (functionHandlesCancel) {
              params.doneFunction(false);
            }

            if (params.closeOnCancel) {
              closeModal();
            }
          } else {
            closeModal();
          }
          $contentDiv.innerHTML = '';
          break;
      }
    };

    $buttons = modal.querySelectorAll('button');
    for (i = 0; i < $buttons.length; i++) {
      $buttons[i].onclick     = onButtonEvent;
      $buttons[i].onmouseover = onButtonEvent;
      $buttons[i].onmouseout  = onButtonEvent;
      $buttons[i].onmousedown = onButtonEvent;
      //$buttons[i].onmouseup   = onButtonEvent;
      $buttons[i].onfocus     = onButtonEvent;
    }

    // Remember the current document.onclick event.
    previousDocumentClick = document.onclick;
    document.onclick = function (e) {
      var target = e.target || e.srcElement,
          clickedOnModal = (modal === target),
          clickedOnModalChild = isDescendant(modal, e.target),
          modalIsVisible = hasClass(modal, 'visible'),
          outsideClickIsAllowed = modal.getAttribute('data-allow-ouside-click') === 'true';

      if (!clickedOnModal && !clickedOnModalChild && modalIsVisible && outsideClickIsAllowed) {
        closeModal();
      }
    };

    // Keyboard interactions
    $okButton = modal.querySelector('button.confirm');
    $cancelButton = modal.querySelector('button.cancel');
    $modalButtons = modal.querySelectorAll('button:not([type=hidden])');

    function handleKeyDown(e) {
      var i,
          keyCode = e.keyCode || e.which,
          $targetElement = e.target || e.srcElement,
          btnIndex = -1; // Find the button - note, this is a nodelist, not an array.;

      if ([9, 13, 32, 27].indexOf(keyCode) === -1) {
        // Don't do work on keys we don't care about.
        return;
      }

      for (i = 0; i < $modalButtons.length; i++) {
        if ($targetElement === $modalButtons[i]) {
          btnIndex = i;
          break;
        }
      }

      if (keyCode === 9) {
        // TAB
        if (btnIndex === -1) {
          // No button focused. Jump to the confirm button.
          $targetElement = $okButton;
        } else {
          // Cycle to the next button
          if (btnIndex === $modalButtons.length - 1) {
            $targetElement = $modalButtons[0];
          } else {
            $targetElement = $modalButtons[btnIndex + 1];
          }
        }

        stopEventPropagation(e);
        $targetElement.focus();
        setFocusStyle($targetElement, params.confirmButtonColor); // TODO

      } else {
        if (keyCode === 13 || keyCode === 32) {
            if (btnIndex === -1) {
              // ENTER/SPACE clicked outside of a button.
              $targetElement = $okButton;
            } else {
              // Do nothing - let the browser handle it.
              $targetElement = undefined;
            }
        } else if (keyCode === 27 &&
            !($cancelButton.hidden || $cancelButton.style.display === 'none')) {
          // ESC to cancel only if there's a cancel button displayed (like the alert() window).
          $targetElement = $cancelButton;
        } else {
          // Fallback - let the browser handle it.
          $targetElement = undefined;
        }

        if ($targetElement !== undefined) {
          fireClick($targetElement, e);
        }
      }
    }

    previousWindowKeyDown = window.onkeydown;
    window.onkeydown = handleKeyDown;

    function handleOnBlur(e) {
      var i = 0,
          btnIndex = -1,
          $targetElement = e.target || e.srcElement,
          $focusElement = e.relatedTarget,
          modalIsVisible = hasClass(modal, 'visible');

      if (modalIsVisible) {
             // Find the button - note, this is a nodelist, not an array.

        if ($focusElement !== null) {
          // If we picked something in the DOM to focus to, let's see if it was a button.
          for (i = 0; i < $modalButtons.length; i++) {
            if ($focusElement === $modalButtons[i]) {
              btnIndex = i;
              break;
            }
          }

          if (btnIndex === -1) {
            // Something in the dom, but not a visible button. Focus back on the button.
            $targetElement.focus();
          }
        } else {
          // Exiting the DOM (e.g. clicked in the URL bar);
          lastFocusedButton = $targetElement;
        }
      }
    }

    $okButton.onblur = handleOnBlur;
    $cancelButton.onblur = handleOnBlur;

    window.onfocus = function () {
      // When the user has focused away and focused back from the whole window.
      window.setTimeout(function () {
        // Put in a timeout to jump out of the event sequence. Calling focus() in the event
        // sequence confuses things.
        if (lastFocusedButton !== undefined) {
          lastFocusedButton.focus();
          lastFocusedButton = undefined;
        }
      }, 0);
    };
  };

  /*
   * Set type, text and actions on modal
   */

  function setParameters(params) {
    var $icon, xhr, $customIcon, _imgWidth, _imgHeight, imgWidth, imgHeight, hasDoneFunction,
        styleProps, prop,
        i = 0,
        modal = getModal(),
        $title = modal.querySelector('h2'),
        $text = modal.querySelector('p'),
        $cancelBtn = modal.querySelector('button.cancel'),
        $confirmBtn = modal.querySelector('button.confirm'),
        $content = modal.querySelector('.content'),
        validType = false;

    // Title
    $title.innerHTML = escapeHtml(params.title).split('\n').join('<br>');

    // Text
    $text.innerHTML = escapeHtml(params.text || '').split('\n').join('<br>');
    if (params.text) {
      show($text);
    }

    // Icon
    hide(modal.querySelectorAll('.icon'));
    if (params.type) {
      for (i = 0; i < alertTypes.length; i++) {
        if (params.type === alertTypes[i]) {
          validType = true;
          break;
        }
      }
      if (!validType) {
        window.console.error('Unknown alert type: ' + params.type);
        return false;
      }
      $icon = modal.querySelector('.icon.' + params.type);
      show($icon);

      // Animate icon
      switch (params.type) {
        case 'success':
          addClass($icon, 'animate');
          addClass($icon.querySelector('.tip'), 'animateSuccessTip');
          addClass($icon.querySelector('.long'), 'animateSuccessLong');
          break;
        case 'error':
          addClass($icon, 'animateErrorIcon');
          addClass($icon.querySelector('.x-mark'), 'animateXMark');
          break;
        case 'warning':
          addClass($icon, 'pulseWarning');
          addClass($icon.querySelector('.body'), 'pulseWarningIns');
          addClass($icon.querySelector('.dot'), 'pulseWarningIns');
          break;
      }

    }

    // Custom image
    if (params.imageUrl) {
       $customIcon = modal.querySelector('.icon.custom');

      $customIcon.style.backgroundImage = 'url(' + params.imageUrl + ')';
      show($customIcon);

       _imgWidth  = 80;
       _imgHeight = 80;

      if (params.imageSize) {
          imgWidth  = params.imageSize.split('x')[0];
          imgHeight = params.imageSize.split('x')[1];

        if (!imgWidth || !imgHeight) {
          window.console.error('Parameter imageSize expects value with format WIDTHxHEIGHT, got ' +
            params.imageSize);
        } else {
          _imgWidth  = imgWidth;
          _imgHeight = imgHeight;

          $customIcon.css({
            'width': imgWidth + 'px',
            'height': imgHeight + 'px'
          });
        }
      }
      $customIcon.setAttribute('style', $customIcon.getAttribute('style') +
        'width:' + _imgWidth + 'px; height:' + _imgHeight + 'px');
    }
    if (params.sourceUrl) {
        xhr = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP.3.0');

        xhr.open('GET', params.sourceUrl, 1);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                $content.innerHTML = xhr.responseText;
                return;
            }
        };

        xhr.send();
    }

    if (params.html) {
        if (params.html.length) {
            params.html.forEach(function each(elm, idx, lst) {
                if(!elm.length) {
                    $content.appendChild(elm);
                } else {
                    elm.forEach(each);
                }
            });
        } else if (typeof params.html === 'string'){
           $content.innerHTML = params.html;
        } else {
            $content.appendChild(params.html);
        }

    }

    if (params.contentStyle) {
        if (typeof params.contentStyle === 'string'){
            $content.classList.add(params.contentStyle);
        } else if (typeof params.contentStyle === 'object') {
            styleProps = Object.keys(params.contentStyle);

            while ((prop = styleProps.shift())) {
                try {
                    $content.style[prop] = params.contentStyle[prop];
                } catch (e) {}
            }
        }
    }

    // Cancel button
    modal.setAttribute('data-has-cancel-button', params.showCancelButton);
    if (params.showCancelButton) {
      $cancelBtn.style.display = 'inline-block';
    } else {
      hide($cancelBtn);
    }

    // Edit text on cancel and confirm buttons
    if (params.cancelButtonText) {
      $cancelBtn.innerHTML = escapeHtml(params.cancelButtonText);
    }
    if (params.confirmButtonText) {
      $confirmBtn.innerHTML = escapeHtml(params.confirmButtonText);
    }

    // Set confirm button to selected background color
    $confirmBtn.style.backgroundColor = params.confirmButtonColor;

    // Set box-shadow to default focused button
    setFocusStyle($confirmBtn, params.confirmButtonColor);

    // Allow outside click?
    modal.setAttribute('data-allow-ouside-click', params.allowOutsideClick);

    // Done-function
    hasDoneFunction = (params.doneFunction) ? true : false;
    modal.setAttribute('data-has-done-function', hasDoneFunction);
  }

  /*
   * Set hover, active and focus-states for buttons (source: http://www.sitepoint.com/javascript-generate-lighter-darker-color)
   */

  function colorLuminance(hex, lum) {
    // Validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;

    // Convert to decimal and change luminosity
    var rgb = '#', c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ('00' + c).substr(c.length);
    }

    return rgb;
  }

  function hexToRgb(hex) {
    var rgb,
        result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    result.shift();
    rgb = result.map(function (elm, idx, lst) {
        return parseInt(elm, 16);
    });
    return result ? rgb.join(',') : null;
  }

  // Add box-shadow style to button (depending on its chosen bg-color)
  function setFocusStyle($button, bgColor) {
    var rgbColor = hexToRgb(bgColor);
    $button.style.boxShadow = '0 0 2px rgba(' + rgbColor +
        ', 0.8), inset 0 0 0 1px rgba(0, 0, 0, 0.05)';
  }

  /*
   * Animations
   */

  function openModal() {
    var $okButton,
        modal = getModal(),
        wrapper = document.querySelector('.sweet-container');

    wrapper.style.display = 'block';
    fadeIn(getOverlay(), 10);
    show(modal);
    modal.style.display = 'inline-block'
    addClass(modal, 'showSweetAlert');
    removeClass(modal, 'hideSweetAlert');

    previousActiveElement = document.activeElement;
    $okButton = modal.querySelector('button.confirm');
    $okButton.focus();

    setTimeout(function () {
      addClass(modal, 'visible');
    }, 500);
  }

  function closeModal() {
    var $successIcon, $errorIcon, $warningIcon, $wrapper,
        modal = getModal();

    $wrapper = document.querySelector('.sweet-container');
    fadeOut(getOverlay(), 5);
    fadeOut(modal, 5);
    removeClass(modal, 'showSweetAlert');
    addClass(modal, 'hideSweetAlert');
    removeClass(modal, 'visible');

    // Reset icon animations

    $successIcon = modal.querySelector('.icon.success');
    removeClass($successIcon, 'animate');
    removeClass($successIcon.querySelector('.tip'), 'animateSuccessTip');
    removeClass($successIcon.querySelector('.long'), 'animateSuccessLong');

    $errorIcon = modal.querySelector('.icon.error');
    removeClass($errorIcon, 'animateErrorIcon');
    removeClass($errorIcon.querySelector('.x-mark'), 'animateXMark');

    $warningIcon = modal.querySelector('.icon.warning');
    removeClass($warningIcon, 'pulseWarning');
    removeClass($warningIcon.querySelector('.body'), 'pulseWarningIns');
    removeClass($warningIcon.querySelector('.dot'), 'pulseWarningIns');

    // Reset the page to its previous state
    window.onkeydown = previousWindowKeyDown;
    document.onclick = previousDocumentClick;
    if (previousActiveElement) {
      previousActiveElement.focus();
    }
    lastFocusedButton = undefined;
    $wrapper.style.display = 'none';
  }

  /*
   * Set 'margin-top'-property on modal based on its computed height
   */

  function fixVerticalPosition() {
    var modal = getModal();

    modal.style.marginTop = getTopMargin(getModal());
  }

  /*
   * If library is injected after page has loaded
   */

  (function () {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
          initialize();
      } else {
          if (document.addEventListener) {
              document.addEventListener('DOMContentLoaded', function factorial() {
                  document.removeEventListener('DOMContentLoaded', factorial, false);
                  initialize();
              }, false);
          } else if (document.attachEvent) {
              document.attachEvent('onreadystatechange', function stateChangeHandler() {
                  if (document.readyState === 'complete') {
                      document.detachEvent('onreadystatechange', stateChangeHandler);
                      initialize();
                  }
              });
          }
      }
  })();

})(window, document);
