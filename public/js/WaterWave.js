class WaterWave {
    constructor(width, height, inPixels) {
        this.current = [];
        this.previous = [];
        this.dampening = 0.9;
        this.lightRefraction = 9;
        this.lightReflection = 0.1;
        this.inPixels = inPixels;
        this.clipping = 40;
        this.width = width;
        this.height = height;

        for (let x = 0; x < this.width; x++) {
            this.current[x] = [];
            this.previous[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.current[x][y] = 0;
                this.previous[x][y] = 0;
            }
        }

        this.evolutionThreshold = 0.05;


        this.length = 0;
        this.prevLength = 0;

    }

    init() {
        this.prevLength = this.length;
        this.length = this.getLength();
    }

    getLength() {
        return this.width * this.height
    }

    render(x, y) {

        // Handle borders correctly
        var val = (x == 0 ? 0 : this.previous[x - 1][y]) +
            (x == this.width - 1 ? 0 : this.previous[x + 1][y]) +
            (y == 0 ? 0 : this.previous[x][y - 1]) +
            (y == this.height - 1 ? 0 : this.previous[x][y + 1]);

        val += (x == 0 || y == 0 ? 0 : this.previous[x - 1][y - 1]) +
                (x == 0 || y == this.height-1 ? 0 :this.previous[x - 1][y + 1]) +
                (x == this.width-1 || y == 0 ? 0 :this.previous[x + 1][y - 1]) +
                (x == this.width-1 || y == this.height-1 ? 0 :this.previous[x + 1][y + 1]);

        val = ((val / 4.0) - this.current[x][y]) * this.dampening;

        if (val > this.clipping) val = this.clipping;
        if (val < -this.clipping) val = -this.clipping;

        if (Math.abs(val) < this.evolutionThreshold) {
            this.evolving = false;
            val = 0;
            this.length--;
        }

        this.current[x][y] = val;


        // console.log(x,y );
        var strength = this.previous[x][y];


        // var strength = getWater(x, y, can.width, can.height);

        // Refraction of light in water
        var refraction = Math.round(strength * this.lightRefraction);

        var xPix = x + refraction;
        var yPix = y + refraction;

        if (xPix < 0) xPix = 0;
        if (yPix < 0) yPix = 0;
        if (xPix > this.width - 1) xPix = this.width - 1;
        if (yPix > this.height - 1) yPix = this.height - 1;

        // Get the pixel from input
        var iPix = ((yPix * this.width) + xPix) * 4;
        var red = this.inPixels[iPix];
        var green = this.inPixels[iPix + 1];
        var blue = this.inPixels[iPix + 2];

        // Set the pixel to output
        strength *= this.lightReflection;
        strength += 1.0;

        return { red: red, green: green, blue: blue, strength: strength };

    }

    swap() {
        let temp = this.previous;
        this.previous = this.current;
        this.current = temp;
    }

    touchWater(x, y, pressure, array2d = [[0.5, 1.0, 0.5], [1.0, 1.0, 1.0], [0.5, 1.0, 0.5]]) {
        this.prevLength = 0;
        this.length = this.getLength();

        // Place the array2d in the center of the mouse position
        if (array2d.length > 4 || array2d[0].length > 4) {
            x -= array2d.length / 2;
            y -= array2d[0].length / 2;
        }

        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x > this.width) x = this.width;
        if (y > this.height) y = this.height;

        // Big pixel block
        for (var i = 0; i < array2d.length; i++) {
            for (var j = 0; j < array2d[0].length; j++) {

                if (x + i >= 0 && y + j >= 0 && x + i <= this.width - 1 && y + j <= this.height - 1) {
                    this.previous[x + i][y + j] = array2d[i][j] * pressure;
                }

            }
        }
    }

    done() {
        return this.length == 0 && this.prevLength == 0;
    }

}