// w1y - we illuminate you
// (c)copyright 2019 by Gerald Wodni <gerald.wodni@gmail.com>

const _ = require("underscore");

module.exports = {
    setup: function( k ) {
        const parStartAddress = 32;
        const parCount = 6;

        /* value aggregator - keep static for now, extend if needed */
        function vals( req, obj ){
            return _.extend( obj || {}, {
                title: "w1y - we 1llum1n4t3 y0u",
                parStartAddress: parStartAddress,
                parCount: parCount,
                channelColors: {
                    "r": "#F00",
                    "g": "#0F0",
                    "b": "#00F",
                    "w": "#CCC",
                    "a": "#F80",
                    "u": "#80F",
                }
            });
        }

        /* kids, this is what a simple api looks like */
        k.router.get("/", function( req, res ) {
            k.jade.render( req, res, "home", vals(req) );
        });
    }
};
