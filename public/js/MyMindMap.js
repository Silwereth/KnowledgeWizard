/**
 * OPTIONS
 */

/** global ariables */
let $wrapper, $paths, $mainTopic, nodes;

/** vertical spacing between nodes */
let spacing = 50;

/** branches color scheme */
let colors = {
    1: '#462771',
    2: '#B89AE2',
    3: '#704F9F',
    4: '#1E093C',
    5: '#2B3273',
    6: '#9EA5E3',
    7: '#555CA1',
    8: '#732069',
    9: '#E393D9',
    10: '#A24997',
    11: '#3D0536',
    12: '#0E000C',
};


/**
 * EVENTS and ACTIONS
 */

/**
 *
 * @param $node string
 */
function showTextInputDialog( $node ){
    let $nodeText = $node;

    if( !$node.hasClass('node-text') ){
        if( !$node.hasClass('node') ){
            return;
        }

        $nodeText = $('.node-text[data-parent=' + $node.attr('id') + ']');
    }

    let nodeId = $nodeText.attr('data-parent');
    let text = $nodeText.text();
    let $input = $('#text-input').val( text );

    $( "#text-input-dialog" ).dialog({
        autoOpen: true,
        modal: true,
        buttons: {
            "OK": function(){
                $nodeText.text( $input.val() );
                $(this).dialog( "close" );

                movePaths( $('#' + nodeId) );
            },
            Cancel: function() {
                $(this).dialog( "close" );
            }
        }
    });
}


/**
 * TODO - url selector using symfony paths
 *
 * @param $node
 */
function showUrlInputDialog( $node ){
    let dialog = $( "#url-input-dialog" ).dialog({
        autoOpen: true,
        modal: true,
        buttons: {
            "OK": function(){
                $node.attr('data-url', $('#url-input').val());
                dialog.dialog( "close" );
            },
            Cancel: function() {
                dialog.dialog( "close" );
            }
        }
    });
}


/**
 *
 * @param $parent
 */
function collapseBranch( $parent ){
    let children = $parent.children().find('li');

    $.each( children, function() {
        $(this).css('display', 'none');

        let $path = $('path' +
            '[data-parent="' + $parent.attr('id') + '"]' +
            '[data-child="' +  $(this).attr('id') + '"]');

        $path.remove();

        collapseBranch( $(this) );
    });

    $parent.addClass('collapsed');
}


/**
 *
 * @param $parent
 */
function expandBranch( $parent ){
    let children = $parent.children().find('> li');

    $.each( children, function() {
        $(this).css('display', 'block');

        getPath( $parent, $(this) );

        expandBranch( $(this) );
    });

    $parent.removeClass('collapsed');
}


/**
 *
 * @param $parent
 */
function deleteBranch( $parent ){
    let children = $parent.children().find('li');
    let $parentPath = $('path' +
        '[data-child="' + $parent.attr('id') + '"]');

    $.each( children, function() {
        let $childPath = $('path' +
            '[data-parent="' + $parent.attr('id') + '"]' +
            '[data-child="' +  $(this).attr('id') + '"]');

        $childPath.remove();

        $(this).remove();

        deleteBranch( $(this) );
    });

    $parentPath.remove();
    $parent.remove();
}


/**
 *
 */
$(function() {
    $.contextMenu({
        selector: '.node-context-menu',
        callback: function(key, options) {
            if(key === "collapse"){
                collapseBranch($(this));
            }

            if(key === "expand"){
                expandBranch($(this));
            }

            if(key === "delete"){
                deleteBranch($(this));
                movePaths( $('#' + $(this).attr('data-parent')) );
            }

            if(key === "addUrl"){
                showUrlInputDialog($(this));
            }

            if(key === "save"){
                saveMapToDatabase();
            }
        },
        items: {
            "collapse": {
                name: "Collapse",
                icon: "add",
                visible: function( key, e ){
                    return ( !isCollapsed( e.$trigger ) && hasChildNodes( e.$trigger ) )
                }},
            "expand": {
                name: "Expand",
                icon: "add",
                visible: function( key, e ){
                    return isCollapsed( e.$trigger );
                }},
            "delete": { name: "Delete", icon: "delete" },
            "addUrl": { name: "Add url", icon: "add" },
            "goTo": { name: "Go to url", icon: "goTo" },
            "save": { name: "Save", icon: "save" },
            "quit": { name: "Quit", icon: function(){
                    return 'context-menu-icon context-menu-icon-quit';
                }}
        }
    });

    $('.node-context-menu').on('click', function(e){
        event.preventDefault();
    })
});




/**
 * FUNCTIONS
 */

/**
 *
 */
function newDesktop(){
    $paths = $('<div id="paths" />');

    $wrapper = $('#wrapper')
        .data('mind-map-id', 1)
        .data('mind-map-name', 'MyMindMap')
        .draggable()
        .append($paths)
        .position({
            my: "center",
            at: "center+125",
            of: $(window)
        });

    draw = SVG('paths').size('100%', '100%');
}


/**
 *
 */
function newMainTopic( text = "Main topic" ){
    $mainTopic = $('<div>' + text + '</div>')
        .attr('id', 'main-topic')
        .addClass('node-menu-one')
        .addClass('node')
        .attr('data-level', 0)
        .draggable({
            start: function() {
                $('.add-button').remove();
            },
            stop: function() {
                movePaths( $(this) );
            }
        })
        .appendTo($wrapper)
        .position({
            my: "center",
            at: "center",
            of: "#wrapper"
        });

    $mainTopic.on({
        mouseenter: function( event ) {
            if( $(event.target).attr('id') === 'main-topic'){
                showAddButtons( $(event.target), 'left' );
                showAddButtons( $(event.target), 'right' );
            }
        },
        mouseleave: function() {
            $('.add-button').remove();
        },
        dblclick: function( event ) {
            showTextInputDialog( $(event.target ) );
        }
    });

    newContainer( $mainTopic, 'left' );
    newContainer( $mainTopic, 'right' );

    return $mainTopic;
}


/**
 *
 * @param $parent
 * @param side
 */
function newNode( $parent, side ){
    let $node = $('<li class="node"></li>')
        .attr('data-side', side)
        .attr('data-level', parseInt($parent.attr('data-level')) + 1)
        .attr('data-parent', $parent.attr('id'))
        .addClass('node-context-menu')
        .uniqueId()
        .draggable({
            stop: function(){
                if( checkSide( $( this ) )){
                    switchSide( $( this ) );
                }
                movePaths( $( this ) );
            }
        })
        /*.resizable({
            stop: function(){
                movePaths( $parent );
            }
        })*/;

    $node.on({
        mouseenter: function( event ) {
            if( $(event.target).is('li') ){
                showAddButtons( $(event.target), $(event.target).attr('data-side') );
            }
        },
        mouseleave: function() {
            $( '.add-button' ).remove();
        },
        dblclick: function( event ) {
            showTextInputDialog( $(event.target) );
        },
    });


    let $nodeText = $('<div class="node-text" data-parent="' + $node.attr('id') + '">New node</div>');

    $nodeText.appendTo( $node );

    getParentContainer( $parent, side).append( $node );
    reCenterParentContainer( $parent, $node, side, spacing );
    newContainer( $node, side );
    getNodePosition( $parent, $node, side, spacing );
    getPath( $parent, $node );
    movePaths( $parent );
}


/**
 *
 * @param $node
 */
function hasChildNodes( $node ){
   return $node.children('ul').children('li').length;
}


/**
 *
 * @param $node
 */
function isCollapsed( $node ){
    return $node.hasClass('collapsed');
}


/**
 *
 * @param $parent
 * @param side
 *
 * @returns {*|jQuery|HTMLElement}
 */
function getParentContainer( $parent, side ){
    return $('ul[data-parent = "'
        + $parent.attr('id') + '"]'
        + '[data-side = "' + side + '"]'
    );
}


/**
 *
 * @param $parent
 * @param $node
 * @param side
 * @param spacing
 */
function reCenterParentContainer( $parent, $node, side, spacing = 0 ){
    let $parentContainer = getParentContainer( $parent, side );

    if(! $parentContainer.data('centering')){
        return;
    }

    let nodeHeight = parseInt($node.css('height'));
    let oldContainerHeight = parseInt($parentContainer.css('height'));
    let newContainerHeight = oldContainerHeight + nodeHeight + spacing;
    $parentContainer.height(newContainerHeight);

    return setContainerPosition( $parentContainer, side, $parent );
}


/**
 *
 * @param $parentContainer
 * @param side
 * @param $parent
 *
 * @returns {*}
 */
function setContainerPosition( $parentContainer, side, $parent ){
    $parentContainer.position({
        my: getOppositeSide(side) + " center",
        at: side + " center",
        of: $parent
    });

    return $parentContainer;
}


/**
 *
 * @param $parent
 * @param $node
 * @param side
 * @param spacing
 *
 * @returns {*|jQuery|HTMLElement}
 */
function getNodePosition( $parent, $node, side, spacing = 0 ) {
    let $parentContainer = getParentContainer( $parent, side );

    //TODO - better solution
    if( spacing ){
        let children = $parentContainer.children().length;
        spacing = ( children ? (children - 1) : 0 ) * spacing;
    }

    $node.position({
        my: getOppositeSide(side),
        at: side + " center+" + spacing,
        of: $parentContainer
    });

    return $node;
}


/**
 *
 *
 * @param $node
 * @param side
 */
function newContainer( $node, side ){
    return $('<ul></ul>')
        .addClass('container')
        .attr('id', 'container-' + side + '-' + $node.attr('id'))
        .attr('data-parent', $node.attr('id'))
        .attr('data-side', side)
        .attr('data-level', parseInt($node.attr('data-level')) + 1)
        .css('height', parseInt($node.css('height')))
        .data('centering', true)
        .draggable({
            start: function( event ) {
                $(event.target).data('centering', false)
            },
            stop: function() {
                movePaths( $node );
            }
        })
        .appendTo( $node )
        .position({
            my: getOppositeSide(side),
            at: side,
            of: $node
        });
}


/**
 *
 * @param $element
 * @returns {boolean}
 */
function checkSide( $element ){
    let side = $element.attr('data-side');
    let nodeOffset = $element.offset().left;
    let centerOffset = $('#main-topic').offset().left;

    return (
        ( side === 'left' && ( nodeOffset > centerOffset ) ) ||
        ( side === 'right' && ( nodeOffset < centerOffset ) )
    )
}


/**
 *
 * @param $node
 */
function switchSide( $node ){
    let $parent = $( document.getElementById( $node.attr('id') ) );
    let $container = getParentContainer( $parent, $node.attr('data-side'));
    let $childNodes = $node.children('ul').children('li');
    let newSide = getOppositeSide( $node.attr('data-side') );

    $node.attr('data-side', newSide);
    $container.attr('data-side', newSide);

    $childNodes.each( function(){
        let difference = parseInt( $( this ).css('left') );
        let correction = $node.offset().left - $( this ).offset().left;

        switchSide( $( this ) );

        $( this ).css('left', difference + correction);
    } );

    getNodePosition( $parent, $node, newSide );
    setContainerPosition( $container, newSide, $parent );
}


/**
 *
 * @param side
 *
 * @returns {string}
 */
function getOppositeSide( side ){
    return side === "left" ? "right" : "left";
}


/**
 *
 * @param $node
 * @param side
 */
function showAddButtons( $node, side ){
    if( !$node.hasClass('node') ){
        return false;
    }

    let style = { backgroundColor: $node.css('background-color') };

    let $addButton = $('<div class="add-button">+</div>')
        .attr('id', 'add-' + side)
        .data('side', side)
        .css(style)
        .on('click', function(){
            newNode( $node, side);
        });

    $node.append($addButton);

    $addButton.position({
        my: "center",
        at: side + " center",
        of: $node
    });
}


/**
 *
 * @param $node
 */
function getSide( $node ){
    let mainOffset = $('#main-topic').offset().left;
    let mainCenter = $('#main-topic').width() / 2;

    if( (mainOffset - mainCenter - $node.offset().left) >= 0 ){
        return 'left';
    }

    return 'right';
}


/**
 *
 * @param $parent
 * @param $node
 */
function getPath( $parent, $node ){
    let pathColor = 'purple';//getColor($parent);
    let pathPosition = getPathPosition( $parent, $node );

    /** TODO */
    let path = draw.path(
        'M' + pathPosition.parentLeft + ' ' +
        pathPosition.parentTop + ' L' +
        pathPosition.childLeft + ' ' +
        pathPosition.childTop
    );
    /** TODO */

    path.fill('none')
        .stroke({
        color: pathColor,
        width: 10,
        linecap: 'round',
        linejoin: 'round'
    })
    .attr('data-parent', $parent.attr('id'))
    .attr('data-child', $node.attr('id'));

    $node.attr('data-branch-color', pathColor);
}


/**
 *
 * @param $parent
 * @param $node
 */
function removePath( $parent, $node ){
    $parent.children('div.start-point').remove();
    $node.children('div.end-point').remove();

    $('path' +
        '[data-parent=' + $parent.attr('id') + ']' +
        '[data-child=' + $node.attr('id') + ']'
    ).remove();
}


/**
 *
 * @param $node
 * @param $parent
 *
 * @returns {{parentTop: number, parentLeft: number, childTop: number, childLeft: number}}
 */
function getPathPosition( $parent, $node ){
    let wrapperOffset = $('#wrapper').offset();
    let $start = $('<div class="start-point" />')
        .attr('data-parent', $parent.attr('id'))
        .appendTo( $parent );
    let $end = $('<div class="end-point" />')
        .attr('data-parent', $node.attr('id'))
        .appendTo( $node );
    let side = getSide( $node );

    $start.position({
        my: "center",
        at: side + " center",
        of: $parent
    });

    $end.position({
        my: "center",
        at: getOppositeSide( side ) + " center",
        of: $node
    });

    return {
        parentTop: $start.offset().top - wrapperOffset.top,
        parentLeft: $start.offset().left - wrapperOffset.left,
        childTop: $end.offset().top - wrapperOffset.top,
        childLeft: $end.offset().left - wrapperOffset.left
    };
}


/**
 *
 * @param $node
 */
function movePaths( $node ){
    if( $node.attr('id') != 'main-topic' ){
        let $parent = document.getElementById( $node.attr('data-parent') );

        removePath( $($parent), $node );
        getPath( $($parent), $node );
    }

    let $children = $node.children('ul').children('li');

    $children.each( function(){
            movePaths($(this));
        }
    );
}




/**
 * BACKEND CONNECTION
 */

/**
 *
 */
function clearDesktop(){
    let oldDesktop = $('#wrapper');

    if( oldDesktop ){
        if( $('#paths') ){
            oldDesktop.find('#paths').remove();
            oldDesktop.find('#main-topic').remove();
            oldDesktop.find('.node').remove();
        }
    }
}


/**
 *
 */
function newMindMap(){
    clearDesktop();
    newDesktop();
    newMainTopic();
}


/**
 * autoload - when website visited
 */
function loadLocalMap(){
    let $newMainTopic;

    let data = localStorage.getItem("mapa");
    if (data) {
        $newMainTopic = JSON.parse(data);
    }

    clearDesktop();

    $('#wrapper').append($newMainTopic);

    console.log('DONE');
}


/**
 *
 */
function localMapAvailable(){
    return false;
}


/**
 *
 */
function deleteMapLocal(){
    clearDesktop();
    localStorage.clear();
}


/**
 * autosave - after time period
 */
function autosaveMapLocal(){
    localStorage.clear();

    let mapData = {'main-topic': '<div id="main-topic" class="node-menu-one node-ui-draggable ui-draggable-handle" data-level="0" style=top: 2480px; left: 2450px; background-color: blue"'};

    localStorage.setItem(
        "mapa",
        JSON.stringify($mainTopic)
    );


    console.log(localStorage);

    //inform user how long is from last autosave
}


/**
 * TODO
 */
function saveMapToDatabase(){


    /**
     *
     * TODO
     *
     */
/*    console.log($parent.attr('id'));
    console.log($(this).attr('id'));
    console.log($( this ).offsetRelative('#' + $parent.attr('id')));*/
    /**
     *
     * TODO
     *
     */

    //let $data = {};




    /*let url = $('#wrapper').attr('data-script');
    let nodes = $('#main-topic, .node');
    let data;
    let convertedArray = [];
    let wrapperOffset = $('#wrapper').offset();

    nodes.push($('#main-topic'));
    nodes.push($('.node'));

    $.each( nodes, function() {
        data = {
            "id": $(this).attr('id'),
            "class": $(this).attr('class'),
            "parent": $(this).attr('data-parent'),
            "position": $(this).attr('data-position'),
            "level": $(this).attr('data-level'),
            "branch-color": $(this).attr('data-branch-color'),
            "position-top": parseInt($(this).css('top')),
            "position-left": parseInt($(this).css('left')),
            "color": $(this).css('background-color'),
            "border": $(this).css('border'),
            "width": parseInt($(this).css('width')),
            "height": parseInt($(this).css('height')),
            "text": $(this).text(),
            "url": $(this).attr('data-url')
        };

        convertedArray.push(data);
    });

    var request = $.ajax({
        type: "POST",
        url: url,
        data: {
            'data': {
                'nodes': convertedArray,
                'wrapper': {
                    'top': wrapperOffset.top,
                    'left': wrapperOffset.left,
                    'mind-map-id': $('#wrapper').attr('mind-map-id'),
                    'mind-map-name': $('#wrapper').attr('mind-map-name'),
                }
            }
        },
        dataType: 'application/json; charset=UTF-8'
    });

    request.done(function( msg ) {
        console.log( msg );
    });

    request.fail(function( jqXHR, textStatus, msg ) {
        console.log( "Request failed: " + textStatus );
        console.log(jqXHR.responseText);
    });

    console.log('ajax done');*/
}


/**
 *
 */
function loadMapFromDatabase(){

}


/**
 *
 */
function deleteMapFromDatabase(){

}





/**
 * DOCUMENT READY ACTIONS
 */
$( document ).ready( function(){
    newDesktop();
    newMainTopic();

    if( localMapAvailable() ){
        loadLocalMap();
    }

    autosaveMapLocal();
    loadLocalMap();

    /** Get users mind maps from database - AJAX - create dropdown */

    /** Create buttons */
    /** NODE - add */
    /** save map */
    /** clear map */
    /** load map */
    /** delete map */
    /** duplicate map */

        /** drag */
        /** click */
        /** double click */
        /** hover */
        /** right click */


    /** Events and actions? */

        /** SCREEN */
            /** resize */

        /** WRAPPER */
            /** drag */

        /** MIND MAP COMBOBOX */
            /** click, change */


        /** ADD BUTTONS */
        $('.add-button').on({
            click: function() {
                newNode( $(this) );
            }
        });

        /** CLEAR, NEW, SAVE BUTTONS? */



    /** CONTEXT MENU and DIALOGS */
        /** WRAPPER */

        /** NODES */
            /** change text */
            /** change background */
            /** change border */
            /** change shape */
            /** change url */
            /** go to url */
            /** expand */
            /** collapse */

        /** PATHS */
            /** change color */

});


/**
 * PLUGINS
 */
(function($){
    $.fn.offsetRelative = function(top){
        var $this = $(this);
        var $parent = $this.offsetParent();
        var offset = $this.position();
        if(!top) return offset; // Didn't pass a 'top' element
        else if($parent.get(0).tagName == "BODY") return offset; // Reached top of document
        else if($(top,$parent).length) return offset; // Parent element contains the 'top' element we want the offset to be relative to
        else if($parent[0] == $(top)[0]) return offset; // Reached the 'top' element we want the offset to be relative to
        else { // Get parent's relative offset
            var parent_offset = $parent.offsetRelative(top);
            offset.top += parent_offset.top;
            offset.left += parent_offset.left;
            return offset;
        }
    };
    $.fn.positionRelative = function(top){
        return $(this).offsetRelative(top);
    };
}(jQuery));