export class Interpolator {
    constructor(max) {
        this.max = max;
        this.frame = 0;

        this.current = 0;
        this.prev = 0;
    }

    getInterpolation() {
        const p = this.frame / this.max;
        if (p >= 1) {
            return p;
        }
        this.current = (Math.sin(Math.PI * p - Math.PI / 2) + 1) / 2;
        return this.current;
    }

    getDelta() {
        return this.current - this.prev;
    }

    next() {
        this.prev = this.current;
        this.frame += 1;
    }

    reset() {
        this.prev = 0;
        this.frame = 0;
    }
}
