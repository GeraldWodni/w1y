window.addEventListener("DOMContentLoaded", function() {
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
        document.querySelector("#content").style.borderColor = "#F00";

        document.querySelector("#mood").addEventListener("change", function(evt) {
            ws.send(JSON.stringify({action:"setMood", value: evt.target.value}));
        });
    };
    ws.onerror = ( err ) => {
        document.querySelector("#content").style.borderColor = "#FFF";
        console.log( err );
    };
    ws.onmessage = ( e ) => {
        if( e.data instanceof Blob ) {
            var fileReader = new FileReader();
            fileReader.onload = function( evt ) {
                var dmxChannels = new Uint8Array( evt.target.result );
                pars.forEach( par => {
                    var r = 0, g = 0, b = 0;
                    const maxHeight = 32, topY=37;
                    for( var i = 0; i < par.channels; i++ ) {
                        var value = dmxChannels[par.address+i-1];
                        var height = maxHeight * value / 255 + 1;
                        var y = topY + maxHeight - height;
                        par.$bars[i].setAttribute( "y", y );
                        par.$bars[i].setAttribute( "height", height );

                        /* very primitive color combinration */
                        if( i==0 ) r = value;
                        if( i==1 ) g = value;
                        if( i==2 ) b = value;
                        if( i==3 && value > 0 ) {
                            r += value;
                            g += value;
                            b += value;
                        }
                        if( i==4 && r==0 && g==0 && b==0 && value > 0 ) {
                            r=255;
                            g=128;
                        }
                    }
                    /* set final color */
                    var scale = Math.max( r, g, b );
                    if( scale > 255 )
                        scale = scale/255;
                    else
                        scale = 1.0;
                    //console.log( "RGBS", r, g, b, scale );
                    r *= scale;
                    g *= scale;
                    b *= scale;

                    //console.log( "RGBF", r, g, b );
                    par.$circle.setAttribute("fill", `rgb(${r}, ${g}, ${b})`);
                });
            }
            fileReader.readAsArrayBuffer( e.data );
        }
        else
            console.log( "GOT ELSE:", e.data );
    }
});
