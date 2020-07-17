/**
 * Water ripple effect.
 * Original code (Java) by Neil Wallis 
 * @link http://www.neilwallis.com/java/water.html
 * 
 * Original code (JavaScript) by Sergey Chikuyonok
 * @link http://chikuyonok.ru
 * 
 * @author Manas Sarpatwar
 * @link https://github.com/manassarpatwar
 * 
 * Modifications made to the original code:
 * - Clamped ripples so that they don't flow over to the other side allowing them to reflect along the boundaries
 * - Added a rippleLength variable which helps to decide if the ripple should still animate
 */

class WaterWave {
    constructor(width, height, ctx) {
        this.current = [];
        this.previous = [];

        this.width = width;
        this.height = height;

        this.oldind = this.width;
        this.newind = this.width * (this.height + 3);
        this.half_width = this.width >> 1;
        this.half_height = this.height >> 1;
        this.size = this.width * (this.height+2) * 2,

        this.riprad = 2;
        this.mapind;

        this.ctx = ctx;
        this.texture = this.ctx.getImageData(0, 0, this.width, this.height);
        this.ripple = this.ctx.getImageData(0, 0, this.width, this.height);

        for (var i = 0; i < this.size; i++) {
            this.previous[i] = this.current[i] = 0;
        }
        this.rippleLength = 0;


    }

    render() {
        this.rippleLength = 0;
        this.newFrame();
        this.ctx.putImageData(this.ripple, 0, 0);
    
    }

    newFrame() {
        var i, a, b, data, cur_pixel, new_pixel, old_data;

        //swapping
        i = this.oldind;
        this.oldind = this.newind;
        this.newind = i;

        i = 0;
        this.mapind = this.oldind;


        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                data = ((y == 0 ? 0 : this.current[this.mapind - this.width]) +
                    (x == 0 || y == 0 ? 0 : this.current[this.mapind - this.width-1])+
                    (x == this.width-1 ? 0 : this.current[this.mapind - this.width+1])+
                    (y == this.height-1 ? 0 : this.current[this.mapind + this.width]) +
                    (x == this.width-1 || y == this.height-1 ? 0 : this.current[this.mapind + this.width+1]) +
                    (x == 0 || y == this.height - 1 ? 0 : this.current[this.mapind + this.width-1]) +
                    (x == 0 ? 0 : this.current[this.mapind - 1]) +
                    (x == this.height-1 ? 0 : this.current[this.mapind + 1])) >> 2;
                
                data -= this.current[this.newind + i];
                data -= data >> 5;
            

                this.current[this.newind + i] = data;
                this.rippleLength += data != 0;

                data = 1024 - data;

                old_data = this.previous[i];
                this.previous[i] = data;

                if (old_data != data) {
                    //offsets
                    a = (((x - this.half_width) * data / 1024) << 0) + this.half_width;
                    b = (((y - this.half_height) * data / 1024) << 0) + this.half_height;

                    //bounds check
                    if (a >= this.width) a = this.width - 1;
                    if (a < 0) a = 0;
                    if (b >= this.height) b = this.height - 1;
                    if (b < 0) b = 0;

                    new_pixel = (a + (b * this.width)) * 4;
                    cur_pixel = i * 4;
                
            
                    this.ripple.data[cur_pixel] = this.texture.data[new_pixel];
                    this.ripple.data[cur_pixel + 1] = this.texture.data[new_pixel + 1];
                    this.ripple.data[cur_pixel + 2] = this.texture.data[new_pixel + 2];

                }

                ++this.mapind;
                ++i;
            }
        }
    }

    loadTexture(){
        this.texture = this.ctx.getImageData(0, 0, this.width, this.height);
    }

    touchWater(dx, dy) {
        this.rippleLength = 0;
        dx <<= 0;
        dy <<= 0;

        for (var j = dy - this.riprad; j < dy + this.riprad; j++) {
            for (var k = dx - this.riprad; k < dx + this.riprad; k++) {
                this.current[this.oldind + (j * this.width) + k] += 512;
            }
        }
    }

    done() {
        return this.rippleLength == 0;
    }
}