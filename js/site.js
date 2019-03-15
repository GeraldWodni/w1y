window.addEventListener("DOMContentLoaded", function() {
    console.log(" LOADED!" );

    /* get simulator lamps */
    var $pars = document.querySelectorAll( "#simulator li svg.par" );
    var pars = [];
    $pars.forEach( $par => {
        pars.push({
            address:  parseInt( $par.getAttribute( "data-address" ) ),
            channels: parseInt( $par.getAttribute( "data-channels" ) ),
            $circle: $par.querySelector("circle"),
            $bars: $par.querySelectorAll("rect")
        });
    });

    /* subscribe to dmx websocket */
    var ws = new WebSocket(`ws://${location.host}/dmx`);
    ws.onopen = () => { 
        document.querySelector("#content").style.borderColor = "#0F0";
    };
    ws.onerror = ( err ) => {
        document.querySelector("#content").style.borderColor = "#F00";
        console.log( err );
    };
    ws.onmessage = ( e ) => {
        if( e.data instanceof Blob ) {
            var fileReader = new FileReader();
            fileReader.onload = function( evt ) {
                var dmxChannels = new Uint8Array( evt.target.result );
                pars.forEach( par => {
                    const maxHeight = 32, topY=37;
                    for( var i = 0; i < par.channels; i++ ) {
                        var value = dmxChannels[par.address+i-1];
                        var height = maxHeight * value / 255 + 1;
                        var y = topY + maxHeight - height;
                        par.$bars[i].setAttribute( "y", y );
                        par.$bars[i].setAttribute( "height", height );
                    }
                });
            }
            fileReader.readAsArrayBuffer( e.data );
        }
        else
            console.log( "GOT ELSE:", e.data );
    }
});
