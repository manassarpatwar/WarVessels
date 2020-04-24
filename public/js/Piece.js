class Piece{
    constructor(length, el, cellSize, rot=0){
        this.coords = [];
        this.boardCoords = [];
        this.name = el;
        this.el = select('#'+el)
        this.rotation = rot;
        for(let i = 0; i < length; i++){
            this.coords[i] = [i*this.rotation, i*(1-this.rotation)];
        }
        this.width = 0.4*cellSize+0.6*(length*(1/5)*cellSize);
        this.height = 0.92*length*cellSize;

        this.transform(0,0,this.rotation*90);

        this.el.style.height = this.height+'px';
        this.el.style.width = this.width+'px';
        // this.tutorialPos = this.el.children[0].getAttribute('data-balloon-pos');

        this.dragged = false;
        this.isDragging = false;
        this.startPosition = {x: 0, y: 0};
        this.delta = {x: 0, y: 0};
        this.currentPosition;

        this.ready = false;

        this.el.addEventListener('mousedown', (e) => {this.startDrag(e)},  { passive: false });
        this.el.addEventListener('touchstart', (e) => {this.startDrag(e)},  { passive: false });

    }

    startDrag(e) {
        e.preventDefault();
        if(this.el.classList.contains('interactable')){

            if (e.touches) { e = e.touches[0]; }
            selectedPiece = this;
            this.isDragging = true;
            this.startPosition = {x: e.clientX, y: e.clientY};
            this.currentPosition = this.transform();
            readyBtn.classList.add('noDisplay');
            turn.classList.remove('noDisplay');
            requestAnimationFrame(update);
        }
    }

    getPiecePlace(){
        let data = this.transform();
        data.x -= (this.height/2-this.width/2)*this.rotation;
        data.y += (this.height/2-this.width/2)*this.rotation;
        return {x: data.x, y: data.y};
    }

    getFitBuffer(){
        let data = {x: 0, y :0};
        data.x = (this.height/2-this.width/2)*this.rotation;
        data.y = -(this.height/2-this.width/2)*this.rotation;
        return data;
    }

    getCenter(){
        let data = this.getPiecePlace();
        data.x += this.height/2*this.rotation+this.width/2*(1-this.rotation);
        data.y += this.width/2*this.rotation+this.height/2*(1-this.rotation);

        return data;
    }

    fit(place, cellSize){
        let fitBuffer = this.getFitBuffer();
        let center = {x : (cellSize-this.width)/2, y: (cellSize*this.getLength()-this.height)/2}
        if(this.rotation == 1){
            let tmp = center.x;
            center.x = center.y;
            center.y = tmp;
        }

        this.transform(place.x*cellSize+fitBuffer.x+center.x, place.y*cellSize+fitBuffer.y+center.y);
    }

    transform(x, y, r, el = this.el){
        let d = getComputedStyle(el).transform.split(',').map(d => parseInt(d));

        x = x == null ? d[4] : x;
        y = y == null ? d[5] : y;
        r = r == null ? Math.round(Math.asin(d[1]) * (180/Math.PI)) : r;
        el.style.transform =  "translate("+x+"px, "+y+"px) rotate("+r+"deg)";
        return {x: x, y: y, r: r};
    };

    getLength(){
        return this.coords.length;
    }

    rotate(r){
        if(r == null){
            this.rotation = (this.rotation+1)%2;
            this.coords = this.coords.map(([i, j]) => ([j, i]));
        }else{
            this.rotation = r;
            for(let i = 0; i < length; i++){
                this.coords[i] = [i*r, i*r];
            }
        }
        this.transform(null, null, this.rotation*90);

        // this.el.children[0].style.display = 'none';
        // if(this.rotation == 1){
        //     this.el.children[0].setAttribute('data-balloon-pos', 'up');
        //     this.transform(-this.width/2*(this.rotation), this.height/2*this.rotation, (this.rotation*-90), this.el.children[0]);
        // }else{
        //     this.el.children[0].setAttribute('data-balloon-pos', this.tutorialPos);
        //     this.transform(0, this.height/2, (this.rotation*-90), this.el.children[0]);
        // }
        // this.el.children[0].style.display = 'block';
    }
} 