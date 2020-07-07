class Piece{

    static increaseCount(){
        this.count++;
    }

    constructor(length, name, rot=false){
        this.id = Piece.count;
        this.coords = [];
        this.boardCoords = [];
        this.name = name;
        this.el = select('#'+this.name)
        this.rotation = rot;
        this.length = length;
        for(let i = 0; i < length; i++){
            this.coords[i] = [i*this.rotation, i*(1-this.rotation)];
        }


        this.dragged = false;
        this.isDragging = false;
        this.startPosition = {x: 0, y: 0};
        this.delta = {x: 0, y: 0};
        this.currentPosition;
        this.selected = false;

        this.ready = false;

        const el_img = select('#'+this.name+"-img");
        el_img.addEventListener('mousedown', (e) => {this.startDrag(e)},  { passive: false });
        el_img.addEventListener('touchstart', (e) => {this.startDrag(e)},  { passive: false });

        Piece.increaseCount();
    }

    startDrag(e) {
        e.preventDefault();
        if(this.el.classList.contains('interactable')){
            if (e.touches) { e = e.touches[0]; }
            this.selected = true;
            this.isDragging = true;
            this.startPosition = {x: e.clientX, y: e.clientY};
            this.currentPosition = this.transform();
            this.el.classList.add('pickedup');
            playButton.classList.add('noDisplay');
            infoPara.classList.remove('noDisplay');
            requestAnimationFrame(update);
        }
    }

    getPiecePlace(cellSize){
        const data = this.transform();
        const height = this.length*cellSize;
        const width = cellSize;
    
        data.x -= (height/2-width/2)*this.rotation;
        data.y += (height/2-width/2)*this.rotation;
        return {x: data.x, y: data.y};
    }

    getFitBuffer(cellSize){
        const data = {x: 0, y :0};
        const height = this.length*cellSize;
        const width = cellSize;
        data.x = (height/2-width/2)*this.rotation;
        data.y = -(height/2-width/2)*this.rotation;
        return data;
    }

    getCenter(cellSize){
        const data = this.getPiecePlace(cellSize);
        const height = this.length*cellSize;
        const width = cellSize;
        data.x += height/2*this.rotation+width/2*(1-this.rotation);
        data.y += width/2*this.rotation+height/2*(1-this.rotation);

        return data;
    }

    fit(place, cellSize){
        const buffer = this.getFitBuffer(cellSize);
        this.transform(place.x*cellSize+buffer.x, place.y*cellSize+buffer.y);
    }

    transform(x, y, r, el = this.el){
        const d = getComputedStyle(el).transform.split(',').map(d => parseInt(d));

        x = x == null ? d[4] : x;
        y = y == null ? d[5] : y;
        r = r == null ? Math.round(Math.asin(d[1]) * (180/Math.PI)) : r;
        el.style.transform =  "translate("+x+"px, "+y+"px) rotate("+r+"deg)";
        return {x: x, y: y, r: r};
    };

    rotate(r){
        if(r == null){
            this.rotation = !this.rotation;
            this.coords = this.coords.map(([i, j]) => ([j, i]));
        }else{
            this.rotation = r;
            for(let i = 0; i < length; i++){
                this.coords[i] = [i*r, i*r];
            }
        }
        this.transform(null, null, this.rotation*90);
    }
} 

Piece.count = 1;